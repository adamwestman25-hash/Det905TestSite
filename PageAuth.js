import * as jose from "jose" 
 

function parseHashParams() {
    const hash = window.location.hash.substring(1);
    return Object.fromEntries(new URLSearchParams(hash));
}

const { id_token } = parseHashParams();

// Go grab the common tokens that AWS has 
const JWKS_URL = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Bla3rOZ2X/.well-known/jwks.json";
const jwks = await fetch(JWKS_URL).then(res => res.json());

// Validate our token use JOSE 
const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL));
async function verifyToken(token) {
    try {
        const { payload, protectedHeader } = await jose.jwtVerify(token, JWKS, {
            issuer: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Bla3rOZ2X`,
            audience: "5j7nnc5kjn80gd8rcop5r16223"
        });

        return payload; // valid!
    } catch (err) {
        console.error("Invalid token:", err);
        return null; // invalid
    }
}

verifyToken().then(

    function(success) 
    {
        //nothing
    }, 
    function(error) 
    {
        window.open('BadLogin.html'); 
    }

)

