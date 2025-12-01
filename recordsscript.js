
var rawTable = new Object(); 

// Used during page setup to reformat individual data point references. 
// Expectation is to be able to reference a data value by using table.value or table["value"],
// however AWS DynamoDB gives us data in a format where we have to write table.value.S or
// table.value.N dependent on if its a string, integer, float, etc.
// So this function just undos that 
 function unmarshal(attr) {
    if (attr == null) return attr;

    if (attr.S !== undefined) return attr.S;
    if (attr.N !== undefined) return Number(attr.N);
    if (attr.BOOL !== undefined) return attr.BOOL;
    if (attr.NULL !== undefined) return null;

    if (attr.L !== undefined) return attr.L.map(unmarshal);
    if (attr.M !== undefined) {
        const obj = {};
        for (const [k, v] of Object.entries(attr.M)) {
            obj[k] = unmarshal(v);
        }
        return obj;
    }

    // Strings sets / number sets if you're using them:
    if (attr.SS !== undefined) return [...attr.SS];
    if (attr.NS !== undefined) return attr.NS.map(Number);

    return attr;  // fallback

 };  

// Loading the whole cadet data table from AWS DynamoDB
async function loadData() {
    const response = await fetch("https://v0cw8wniua.execute-api.us-east-1.amazonaws.com/Stage1/CadetRecordRelay");
    rawTable = await response.json();
    return true; 
    
}

// Sets up all the different elements on the webpage 
function PageSetup() {



    const selector = document.getElementById('DataSelector');
    const grid = document.getElementById('grid');
    const datagrid = document.getElementById('datagrid');
    datagrid.style.display = 'grid';
    
    function getBackgroundColor() {
        const r = 93;
        const g = 138;
        const b = 168;
        return `rgb(\${r},\${g},\${b})`; 
    }; 

    // Setup selections 
    var cadetTable = new Map(); 

    // Reformatting the retrieved data table into a map that can be more easily accessed 
    Object.values(rawTable).forEach(index => {
        const rawName = index.hasOwnProperty("Cadet"); 

        if (rawName) 
            {
                
                // We are "unmarshalling" the raw DynamoDB table here. 
                // Basically when AWS sends us the table as a Map, you'd expect to be able to 
                // grab values by writing key.value or key["value"], however for DDB tables 
                // they force you to write it as key.value.S or key.value.N depending on the 
                // object type. This is horrible and I don't know why its like this. I had to learn
                // that the hard way through trial and error. Just use the unmarshal command I took 
                // off ChatGPT 

                var cleanPropertyList = new Map(); 
                Object.keys(index).forEach(rawProperties => {
                    cleanPropertyList.set(rawProperties, unmarshal(index[rawProperties])); 
                }); 
                var name = cleanPropertyList.get("Cadet");  
                cleanPropertyList.delete("Cadet");  
                cadetTable.set(name, cleanPropertyList)
            }

        else {console.log("Could not find the name value")}
        console.log("went through an item"); 
    }); 

    // Setup drop down options with cadet names as selectable values, which would then point to their data
    for (const cadet of cadetTable.keys()) {

        var cadetoption = document.createElement("option"); 
        cadetoption.value = cadet; 
        cadetoption.textContent = cadet;
        
        selector.appendChild(cadetoption); 

    }

    let mainPropertiesTile = document.createElement('div2'); 
    let inspectionTile = document.createElement('div2'); 

    mainPropertiesTile.className = 'grid-square'; 
    mainPropertiesTile.style.backgroundColor = getBackgroundColor(); 

    inspectionTile.className = 'grid-square'; 
    inspectionTile.style.backgroundColor = getBackgroundColor(); 

    selector.addEventListener('change', () => {

        // Reset tiles that are potentially full of old data (or at start of session, already empty)
        mainPropertiesTile.innerHTML = ""; 
        inspectionTile.innerHTML = ""; 
        grid.innerHTML = '';
        datagrid.innerHTML = '';


        // Get new data set
        const selectedId = selector.value;
        if (!selectedId) return;

        var cadetData = cadetTable.get(selectedId); 
        if (!cadetData) { warn("No table entry found for " + selectedId); }
        
        // Start filling tiles with new data
        let htmlString = '<strong>General Data</strong><br>'; 
        let inspectionString = '<strong>Inspection Scores</strong><br>'; 

        // Create tiles for individual data points 
        cadetData.forEach((propertyValue, property) => {
            if (propertyValue !== null) {
                if (property == "Inspections") {
                    console.log(propertyValue); 
                    Object.keys(propertyValue).forEach(date => {
                        inspectionString += '<br><strong>' + date + ':</strong> ' + propertyValue[date]
                    });
                    inspectionTile.innerHTML = inspectionString; 
                } else {
                    console.log(property); 
                    console.log(propertyValue); 
                    htmlString += ('<br><strong>' + property + ':</strong> ' + propertyValue);
                };
            };
        });

        mainPropertiesTile.innerHTML = htmlString; 
        datagrid.appendChild(mainPropertiesTile); 
        datagrid.appendChild(inspectionTile); 
    });

    // After everything is setup, remove the loading screen and show the selector 
    document.getElementById("LoadOverlay").style.display = "none"; 
    document.getElementById("DataSelector").style.display = "block"; 
    console.log("hide?")

}; 

loadData().then(
    function(success) {PageSetup()}, 
    function(error) {warn("An error has occurred while loading data"); console.log(error); }
)
