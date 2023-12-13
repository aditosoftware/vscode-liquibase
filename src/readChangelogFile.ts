import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// interface ChangeSet {
//   id: string;
//   author: string;
//   context: string;
// }

// export function readLiquibaseChangelog(filePath: string): vscode.QuickPickItem[] {
//   try {
//     const fileContent = fs.readFileSync(filePath, 'utf-8');
//     const fileExtension = path.extname(filePath).toLowerCase();

//     switch (fileExtension) {
//       case '.sql':
//         return extractContextsFromSQL(fileContent);
//       case '.json':
//         return extractContextsFromJSON(fileContent);
//       case '.xml':
//         return extractContextsFromXML(fileContent);
//       case '.yaml':
//       case '.yml':
//         return extractContextsFromYAML(fileContent);
//       default:
//         throw new Error(`Unsupported file extension: ${fileExtension}`);
//     }
//   } catch (error) {
//     throw new Error(`Error reading changelog file`);
//   }
// }

// function extractContextsFromSQL(content: string): vscode.QuickPickItem[] {
//   const regex = /--changeset\s+\w+:\w+\s+context:([^\s]+)/g;
//   const matches = content.match(regex);
//   return matches ? matches.map(match => match.split(':')[1].trim()) : [];
// }

// function extractContextsFromJSON(content: string): string[] {
//   const jsonData = JSON.parse(content);
//   return extractContextsFromChangeSets(jsonData.changeSet);
// }

// function extractContextsFromXML(content: string): string[] {
//     const regexChangeSet = /<changeSet[^>]*?context="([^"]+)"/g;
//     const regexInclude = /<include[^>]*?context="([^"]+)"/g;
  
//     const matchesChangeSet = content.match(regexChangeSet) || [];
//     const matchesInclude = content.match(regexInclude) || [];
  
//     const contextsFromChangeSet = matchesChangeSet.map(match => match.split('"')[1]);
//     const contextsFromInclude = matchesInclude.map(match => match.split('"')[1]);
  
//     return [...contextsFromChangeSet, ...contextsFromInclude];
//   }

// function extractContextsFromYAML(content: string): string[] {
//   const yamlData = yaml.safeLoad(content);
//   return extractContextsFromChangeSets(yamlData.changeSet);
// }

// function extractContextsFromChangeSets(changeSets: any): string[] {
//   if (Array.isArray(changeSets)) {
//     return changeSets.map((changeSet: ChangeSet) => changeSet.context);
//   } else if (changeSets) {
//     return [changeSets.context];
//   } else {
//     return [];
//   }
// }