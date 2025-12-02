
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

    // Grabbing/creating all page elements

    const selector = document.getElementById('DataSelector');
    const nameSearch = document.getElementById('nameSearch'); 
    const classFilter = document.getElementById('filterASClass'); 

    const grid = document.getElementById('grid');
    const datagrid = document.getElementById('datagrid');
    datagrid.style.display = 'grid';

    let mainPropertiesTile = document.createElement('div2'); 
    let inspectionTile = document.createElement('div2'); 

    mainPropertiesTile.className = 'grid-square'; 
    inspectionTile.className = 'grid-square'; 
    
    // Creating tables to hold all the collected data, and then also holding the filtered ones 
    let fullData = [];  // All cadets
    let classFilteredData = [];  // Cadets remaining after class filters
    let nameFilteredData = [];  // Cadets remaining after name filters

    // Setup selections 
    var cadetTable = new Map(); 
    var cadetOptionButtons = []; 

    // Reformatting the retrieved data table (rawTable) into a map that can be more easily accessed (cadetTable)
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

        else {console.log("Could not find the name value"); }
    }); 

    // Function that displays the data from a specified cadet
    function displayData(cadet) {

        // Reset tiles that are potentially full of old data (or at start of session, already empty)
        mainPropertiesTile.innerHTML = ""; 
        inspectionTile.innerHTML = ""; 

        mainPropertiesTile.style.color = "white"; 
        inspectionTile.style.color = "white"; 
        grid.innerHTML = '';
        datagrid.innerHTML = '';
        
        var cadetData = cadetTable.get(cadet); 
        if (!cadetData) { console.warn("No table entry found for " + cadet); return; }
        // Start filling tiles with new data
        let htmlString = '<strong>General Data</strong><br>'; 
        let inspectionString = '<strong>Inspection Scores</strong><br>'; 

        // Create tiles for individual data points 
        cadetData.forEach((propertyValue, property) => {
            if (propertyValue !== null) {
                if (property == "Inspections") {

                    Object.keys(propertyValue).forEach(date => {
                        inspectionString += '<br><strong>' + date + ':</strong> ' + propertyValue[date]
                    });
                    inspectionTile.innerHTML = inspectionString; 
                } else {
                    htmlString += ('<br><strong>' + property + ':</strong> ' + propertyValue);
                };
            };
        });

        // Displaying the resulting data onto the page 
        mainPropertiesTile.innerHTML = htmlString; 
        datagrid.appendChild(mainPropertiesTile); 
        datagrid.appendChild(inspectionTile); 

    }
    // Function that resets and fills table with dropdown options, filtered or unfiltered
    function fillTable() 
    {
        selector.innerHTML = ""; 
        cadetOptionButtons = [];

        // Creates an array that combines the two filters together, if used 
        let filteredCadets = []; 

        if (classFilteredData.length == 0 && nameFilteredData.length == 0) {filteredCadets = fullData; console.log("no filters active"); }
        else if (classFilteredData.length >= 1 && nameFilteredData.length >= 1) 
            {
                console.log("Both class and name search filters combined")
                for (const cadetIndex of classFilteredData) 
                    {
                        if (nameFilteredData.includes(cadetIndex)) {filteredCadets.push(cadetIndex);}
                    }
            }
        else if (classFilteredData.length >= 1) {filteredCadets = classFilteredData; console.log("Only filtered via class filter") }
        else if (nameFilteredData.length >= 1) {filteredCadets = nameFilteredData; console.log("Only filtered via name search"); }
        else 
        {
            // No applicable cadets found 
            console.log("no cadets found after filters ")
        }


        if (filteredCadets.length == 0) {filteredCadets.push("No cadets found");}

        
        // Goes through the list of filtered dropdown options and creates dropdown options for them 
        for (const cadetName of filteredCadets) 
        {
            var cadetoption = document.createElement("option"); 
            cadetoption.value = cadetName; 
            cadetoption.textContent = cadetName;

            // Creates buttons 
            selector.appendChild(cadetoption); 
            cadetOptionButtons.push(cadetoption); 
        }

        displayData(filteredCadets[0]); // Instantly displays the data of the cadet who first appears in the list 
    }

    // Putting cadet names into an array, so it can be put into a drop down menu 
    for (const cadet of cadetTable.keys()) {
        fullData.push(cadet)
    }
    fillTable() // Fill drop down menu with all cadets 

    // Listens to when the cadet dropdown changes, aka when the user chooses a specific cadet they want to see 
    selector.addEventListener('change', function(selectEvent) {
        // Grab selected cadet 
        const selectedId = selectEvent.target.value;
        if (!selectedId) return;

        displayData(selectedId); 

    });

    nameSearch.addEventListener('input', function(searchEvent) {
        let inputString = searchEvent.target.value; 
        inputString = inputString.trim().toUpperCase(); 

        nameFilteredData = []; 
        if (inputString != "") 
        {
            for (const cadet of cadetTable.keys()) 
            {
                if (cadet.toUpperCase().includes(inputString) == true) 
                {
                    nameFilteredData.push(cadet); 
                }
            }

            if (nameFilteredData.length == 0) {nameFilteredData.push("No cadets found")}
            console.log(nameFilteredData)
        } 
        fillTable(); 
    }); 

    // Listens to class filter dropdown, updating the list of viewable cadets
    classFilter.addEventListener('change', function(classEvent) {
        
        classFilteredData = []; 
        if (classEvent.target.value != "None") 
        {
            for (const cadet of cadetTable.keys()) 
            {
                if (cadetTable.get(cadet).get("ASClass") == classEvent.target.value) 
                {
                    classFilteredData.push(cadet); 
                }
            }
        }
        fillTable(); 
    }); 

    // After everything is setup, remove the loading screen and show the selector 
    document.getElementById("LoadOverlay").style.display = "none"; 
    document.getElementById("DataSelector").style.display = "block"; 
}; 

loadData().then(
    function(success) {PageSetup()}, 
    function(error) {console.warn("An error has occurred while loading data"); console.log(error); }
)
