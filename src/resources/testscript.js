const fs = require('fs');
const path = require('path');
const xml2js = require('xml-js');

//TODO: DatabaseType 
const DatabaseTypeEnum = Object.freeze(
    {
    12: "mariadb", 
    11: ""
    });

// Specify the folder containing XML files
const folderPath = 'C:\\Users\\f.adler\\Documents\\AditoProjects\\xRM\\data\\config'; //TODO: use workplace or __dirname to get to the actual folder

// Read all files in the specified folder
fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading folder:', err);
        return;
    }

    // Filter XML files
    const xmlFiles = files.filter(file => path.extname(file).toLowerCase() === '.xml');

    // Process each XML file
    xmlFiles.forEach(xmlFile => {
        const xmlFilePath = path.join(folderPath, xmlFile);
        processXmlFile(xmlFilePath);
    });
});


function processXmlFile(xmlFilePath) {
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8');
    const options = { compact: true, ignoreComment: true, spaces: 4 };

    try {
        const result = xml2js.xml2json(xmlData, options);

        const aditowebNode = result.preferences.root.node.node.node.node.node;
        if (!aditowebNode) {
            throw new Error('Invalid XML structure. Missing "aditoweb" node.');
        }

        const serverPrefsNode = aditowebNode.node;
        if (!serverPrefsNode) {
            throw new Error('Invalid XML structure. Missing "node" under "aditoweb".');
        }

        const systemDbNode = serverPrefsNode[0]._attributes.name;
        if (!systemDbNode) {
            throw new Error('Invalid XML structure. Missing "systemdb" node.');
        }

        const dbAliasNode = serverPrefsNode[0].map.node.map;
        if (!dbAliasNode) {
            throw new Error('Invalid XML structure. Missing "db alias" node.');
        }

        //TODO: Classpath?
        const database = getValueFromEntry(dbAliasNode, 'database');
        const databaseType = getValueFromEntry(dbAliasNode, 'databasetype');
        const host = getValueFromEntry(dbAliasNode, 'host');
        const port = getValueFromEntry(dbAliasNode, 'port');
        const password = getValueFromEntry(dbAliasNode, 'password');
        const user = getValueFromEntry(dbAliasNode, 'user');
        
        const serverId = serverPrefsNode[1].map.entry._attributes.value;

        const workFolder = path.normalize(path.join(path.normalize(folderPath), "..", "..", ".liquibase", "_____SYSTEMALIAS", "changelog.xml"));

        console.log('Database:', database);
        console.log('Database Type:', databaseType, "->", DatabaseTypeEnum[databaseType]);
        console.log('Host:', host);
        console.log('Port:', port);
        console.log('Password:', password);
        console.log('User:', user);
        console.log('Server ID:', serverId);
        

        const liquibaseProperties = `changelogFile: ${workFolder}
driver: org.mariadb.jdbc.Driver
url: jdbc:${DatabaseTypeEnum[databaseType]}://${host}:${port}/${database}
username: ${user}
password: ${password}`;

        const filePath = `C:\\Users\\f.adler\\Documents\\AditoProjects\\xRM\\data\\config\\${serverId}.liquibase.properties`; //TODO: get path dynamically 

        fs.writeFileSync(filePath, liquibaseProperties, 'utf-8');
        console.log(`Properties written to ${filePath}`);
        console.log("");
    } catch (error) {
        console.error(error.message);
    }
}

function getValueFromEntry(node, key) {
    let x = node.entry;

    for (const y of x) {
        if (y._attributes.key === key) {
            return y._attributes.value;
        }
    }
}