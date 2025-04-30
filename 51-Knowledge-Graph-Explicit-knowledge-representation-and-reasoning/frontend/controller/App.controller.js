"use strict";

sap.ui.define(
  ["sap/base/Log",
    "sap/ui/core/mvc/Controller",
    "sap/tnt/library",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "require",
    "sap/f/FlexibleColumnLayout",
    "sap/ui/core/Fragment",
    "sap/ui/core/dnd/DragInfo",
    "sap/ui/core/dnd/DropInfo",
    "sap/f/dnd/GridDropInfo",
    "sap/ui/core/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    'sap/viz/ui5/controls/Popover',
    'sap/ui/core/HTML',
    "sap/m/Column",
    "sap/m/Text"],
  function (Log, BaseController, tntLib, Device, JSONModel, MessageToast, require, FlexibleColumnLayout, Fragment, DragInfo, DropInfo, GridDropInfo, coreLibrary, Filter, FilterOperator, FlattenedDataset, FeedItem, Popover, HTMLControl, Column, Text) {

    /**
     * ENVIRONMENT VARIABLE MANAGEMENT
     * - Here in NodeJS, we manage the environment variables from SAPUI5 Component.js.
     * - Basically the endpoints are fetched then store in the UI model of endpoint.
     * - Then we parse it to each GLOBAL variables to be consumed.
     */
    var ALL_PROJECTS_EP, PROJECT_DETAILS_EP, HANA_EMB_SEARCH_EP, ALL_PROJECTS_BY_EXPERT_EP, ALL_PROJECTS_CATEGORIES_EP, ALL_CATEGORIES_EP, UPDATE_CATEGORIES_EP, ALL_CLUSTERS_EP;

    const oConfigModel = sap.ui.getCore().getModel("endpoint");
    if (oConfigModel) {
      const pyEndpoint = oConfigModel.getProperty("/pyEndpoint");
      ALL_PROJECTS_EP = pyEndpoint + "/get_all_projects";
      PROJECT_DETAILS_EP = pyEndpoint + "/get_project_details";
      HANA_EMB_SEARCH_EP = pyEndpoint + "/compare_text_to_existing";
      ALL_PROJECTS_BY_EXPERT_EP = pyEndpoint + "/get_advisories_by_expert_and_category";
      ALL_PROJECTS_CATEGORIES_EP = pyEndpoint + "/get_all_project_categories";
      ALL_CATEGORIES_EP = pyEndpoint + "/get_categories";
      UPDATE_CATEGORIES_EP = pyEndpoint + "/update_categories_and_projects";
    }

    /** URL ENDPOINTS FOR ADVISORY USE CASE NAVIGATION */
    const COINSTAR_URL = "https://partner-innovation-labs.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=ad630cb6-3c21-4c62-a834-779557ea8f48#managePSR-display?sap-ui-app-id-hint=saas_approuter_coil.coinstar.partnerservicerequests&/PartnerServiceRequest(ID=4b78084a-29c2-43b7-953d-51d642b2d68a,IsActiveEntity=true)?layout=TwoColumnsMidExpanded&sap-iapp-state=TASBVMT2FMXN8WWBL0QC6087UBCHISY6HFTT654E2";
    const MSTEAMS_URL = "https://teams.microsoft.com/l/meetup-join/group/SOME_LONG_ID";
    const HANA_EMB_SEARCH_SCHEMANAME = "DBUSER";
    const HANA_EMB_SEARCH_TABLENAME = "TCM_AUTOMATIC";

    var pieCategoryData;


    // shortcut for sap.ui.core.dnd.DropLayout
    var DropLayout = coreLibrary.dnd.DropLayout;

    // shortcut for sap.ui.core.dnd.DropPosition
    var DropPosition = coreLibrary.dnd.DropPosition;

    function createPageJson(header, title, titleUrl, icon, elements) {
      const pageData = {
        pageId: "genericPageId", // You can make this dynamic if needed
        header: header,
        title: title,
        titleUrl: titleUrl,
        icon: icon,
        groups: [
          {
            elements: elements,
          },
        ],
      };

      return { pages: [pageData] }; // Return the complete JSON object
    }

    function copyToClipboard(text) {
      if (!navigator.clipboard) {
        // Fallback for older browsers (using the deprecated execCommand)
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy"); // Deprecated, but still works in many cases
          console.log("Text copied to clipboard (fallback method)");
        } catch (err) {
          console.error("Unable to copy to clipboard (fallback method): ", err);
        }
        document.body.removeChild(textArea);
        return; // Exit early
      }

      // Modern approach using Clipboard API (preferred)
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log("Text copied to clipboard (Clipboard API)");
        })
        .catch(err => {
          console.error("Unable to copy to clipboard (Clipboard API): ", err);
        });
    }

    function openMSTeams(meetingUrl) {
      if (meetingUrl) {
        const teamsProtocol = "msteams://l/meeting/join/?url=" + encodeURIComponent(meetingUrl);
        const fallbackUrl = meetingUrl; // Or your custom fallback URL

        // Open the Teams protocol in a new tab/window
        const newTab = window.open(teamsProtocol, '_blank'); // '_blank' opens in new tab

        if (!newTab) { // Check if pop-up was blocked
          alert('Pop-up blocked! Please allow pop-ups for this site to open the Teams meeting.');
          return; // Stop execution to prevent redirect
        }

        // Fallback (only if the new tab is still accessible - popup blocker check)
        setTimeout(() => {
          if (newTab && newTab.closed) { // Check if the new tab was closed (likely by popup blocker or user)
            window.open(fallbackUrl, '_blank'); // Open fallback in a new tab
          } else if (newTab && newTab.location.href.startsWith(window.location.origin)) { //Check if the opened new tab is still on the same origin
            newTab.location.href = fallbackUrl;
          }
        }, 2000); // Adjust timeout as needed
      } else {
        console.error("Meeting URL is required.");
      }
    }

    function transformDataForCategoryPieGlobal(apiData) {
      const categoryCounts = {};

      // Iterate through the project_categories array
      for (const project of apiData.project_categories) {
        const category = project.category_label;

        // Increment the count for the current category, or initialize it to 1
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }

      // Transform the categoryCounts object into the desired array format
      const transformedData = {
        Categories: Object.entries(categoryCounts).map(([Category, ProjectsCount]) => ({
          Category,
          ProjectsCount,
        })),
      };

      return transformedData;
    }

    async function getClusterData() {
      try {
        const categoriesResponse = await fetch(ALL_CATEGORIES_EP);
        const categories = await categoriesResponse.json();

        const clusterData = categories.map(category => ({
          index: category.index,
          category_descr: category.category_descr, // Renamed for clarity
          category_label: category.category_label
        }));

        return clusterData;

      } catch (error) {
        console.error("Error fetching cluster data:", error);
        return []; // Return an empty array in case of error
      }
    }

    function generateNetworkGraphModelFromSparql(sparqlQuery, ontologyTTL) {
      const nodes = [];
      const lines = [];
      const groups = [];
      const nodeKeys = {};
      let nextNodeKey = 1;
    
      // --- Helper functions (same as before) ---
      function getUniqueNodeKey(identifier) {
        if (!nodeKeys[identifier]) {
          nodeKeys[identifier] = String(nextNodeKey++);
        }
        return nodeKeys[identifier];
      }
    
      function createNode(entityOrClassUri, details = {}) {
        if (nodeKeys[entityOrClassUri]) {
          return nodeKeys[entityOrClassUri];
        }
        const key = getUniqueNodeKey(entityOrClassUri);
        nodes.push({ key, title: details.label || entityOrClassUri.split('/').pop(), label: details.label || entityOrClassUri.split('/').pop(), icon: details.icon || "sap-icon://circle-task-2", status: "Success", shape: details.shape || "Circle", group: details.group });
        return key;
      }
    
      // --- 1. Parse the Ontology TTL (same as before) ---
      const parsedOntology = { classes: {}, properties: {} };
      const ttlLines = ontologyTTL.split('\n').filter(line => line.trim() && !line.startsWith('@prefix'));
    
      ttlLines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const subject = parts[0].replace(/[<>]/g, '');
          const predicate = parts[1].replace(/[<>]/g, '');
          const object = parts[2].replace(/[<>"']/g, '');
    
          if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
            if (object === 'http://www.w3.org/2002/07/owl#Class') {
              parsedOntology.classes[subject] = parsedOntology.classes[subject] || {};
            } else if (object === 'http://www.w3.org/2002/07/owl#ObjectProperty') {
              parsedOntology.properties[subject] = { type: 'object' };
            } else if (object === 'http://www.w3.org/2002/07/owl#DatatypeProperty') {
              parsedOntology.properties[subject] = { type: 'datatype' };
            }
          } else if (predicate === 'http://www.w3.org/2000/01/rdf-schema#comment') {
            if (parsedOntology.classes[subject]) {
              parsedOntology.classes[subject].comment = object;
            } else if (parsedOntology.properties[subject]) {
              parsedOntology.properties[subject].comment = object;
            }
          } else if (predicate === 'http://www.w3.org/2000/01/rdf-schema#label') {
            if (parsedOntology.classes[subject]) {
              parsedOntology.classes[subject].label = object;
            } else if (parsedOntology.properties[subject]) {
              parsedOntology.properties[subject].label = object;
            }
          }
        }
      });
    
      console.log("Parsed Ontology (SPARQL):", parsedOntology);
    
      // --- 2. Analyze the SPARQL Query ---
      const selectVarsMatch = sparqlQuery.match(/SELECT\s+(.*?)\s+FROM/s);
      const whereClauseMatch = sparqlQuery.match(/WHERE\s+\{(.*?)\}/s);
    
      const selectedVariables = selectVarsMatch ? selectVarsMatch[1].trim().split(/\s+/) : [];
      const whereTriples = whereClauseMatch ? whereClauseMatch[1].trim().split(/\.\s*/) : [];
    
      const involvedEntities = new Set();
      const relationships = [];
      const variableToEntityMap = {}; // Map SPARQL variables to ontology entities
    
      // Identify classes and properties from the SPARQL query
      whereTriples.forEach(triple => {
        const parts = triple.trim().split(/\s+/);
        if (parts.length === 3) {
          const subject = parts[0];
          const predicate = parts[1];
          const object = parts[2];
    
          if (predicate === 'a' || predicate === 'rdf:type') {
            involvedEntities.add(object.replace(/[<>]/g, '')); // It's a class
            variableToEntityMap[subject] = object.replace(/[<>]/g, '');
          } else if (predicate.startsWith(':') || predicate.startsWith('<http://www.semanticweb.org/')) {
            relationships.push({ subject, predicate, object });
          }
          involvedEntities.add(subject);
          involvedEntities.add(object);
        }
      });
    
      selectedVariables.forEach(variable => involvedEntities.add(variable));
    
      const entityLabels = {};
      for (const entity of involvedEntities) {
        const entityUri = entity.replace(/[<>]/g, '');
        if (parsedOntology.classes[entityUri] && parsedOntology.classes[entityUri].label) {
          entityLabels[entity] = parsedOntology.classes[entityUri].label;
        } else if (parsedOntology.properties[entityUri] && parsedOntology.properties[entityUri].label) {
          entityLabels[entity] = parsedOntology.properties[entityUri].label;
        } else {
          entityLabels[entity] = entity.startsWith(':') ? entity.substring(1) : entity.split('/').pop();
        }
      }
    
      console.log("Involved Entities (SPARQL):", involvedEntities);
      console.log("Relationships (SPARQL):", relationships);
      console.log("Entity Labels (SPARQL):", entityLabels);
      console.log("Variable to Entity Map:", variableToEntityMap);
    
      // --- 3. Generate Nodes ---
      for (const entity of involvedEntities) {
        const entityUri = entity.replace(/[<>]/g, '');
        const label = entityLabels[entity] || entity; // Use the variable name if no label found
        let shape = "Circle";
        if (parsedOntology.classes[entityUri]) {
          shape = "Box"; // Assuming identified classes are boxes
        }
        createNode(entity, { label, shape }); // Use the SPARQL variable as the initial key
      }
    
      // --- 4. Generate Lines ---
      relationships.forEach(({ subject, predicate, object }) => {
        const predicateUri = predicate.replace(/[<>]/g, '');
    
        // Try to use the mapped entity URIs if available, otherwise use the variables
        const fromNode = variableToEntityMap[subject] || subject;
        const toNode = variableToEntityMap[object] || object;
    
        if (nodeKeys[fromNode] && nodeKeys[toNode]) {
          const propertyLabel = parsedOntology.properties[predicateUri]?.label || predicateUri.split('/').pop() || predicateUri;
          lines.push({ from: nodeKeys[fromNode], to: nodeKeys[toNode], label: propertyLabel });
        }
      });
    
      return new sap.ui.model.json.JSONModel({
        nodes: nodes,
        lines: lines,
        groups: groups
      });
    }

    // function generateNetworkGraphModel(sqlSelectQuery, ontologyTTL) {
    //   const nodes = [];
    //   const lines = [];
    //   const groups = [];
    //   const nodeKeys = {};
    //   let nextNodeKey = 1;
    
    //   // --- Helper functions ---
    //   function getUniqueNodeKey(identifier) {
    //     if (!nodeKeys[identifier]) {
    //       nodeKeys[identifier] = String(nextNodeKey++);
    //     }
    //     return nodeKeys[identifier];
    //   }
    
    //   function createNode(entityOrClassUri, details = {}) {
    //     if (nodeKeys[entityOrClassUri]) {
    //       return nodeKeys[entityOrClassUri];
    //     }
    //     const key = getUniqueNodeKey(entityOrClassUri);
    //     nodes.push({ key, title: details.label || entityOrClassUri.split('/').pop(), label: details.label || entityOrClassUri.split('/').pop(), icon: details.icon || "sap-icon://circle-task-2", status: "Success", shape: details.shape || "Circle", group: details.group });
    //     return key;
    //   }
    
    //   // --- 1. Parse the Ontology TTL ---
    //   const parsedOntology = { classes: {}, properties: {} };
    //   const ttlLines = ontologyTTL.split('\n').filter(line => line.trim() && !line.startsWith('@prefix'));
    
    //   ttlLines.forEach(line => {
    //     const parts = line.trim().split(/\s+/);
    //     if (parts.length >= 3) {
    //       const subject = parts[0].replace(/[<>]/g, '');
    //       const predicate = parts[1].replace(/[<>]/g, '');
    //       const object = parts[2].replace(/[<>"']/g, '');
    
    //       if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
    //         if (object === 'http://www.w3.org/2002/07/owl#Class') {
    //           parsedOntology.classes[subject] = parsedOntology.classes[subject] || {};
    //         } else if (object === 'http://www.w3.org/2002/07/owl#ObjectProperty') {
    //           parsedOntology.properties[subject] = { type: 'object' };
    //         } else if (object === 'http://www.w3.org/2002/07/owl#DatatypeProperty') {
    //           parsedOntology.properties[subject] = { type: 'datatype' };
    //         }
    //       } else if (predicate === 'http://www.w3.org/2000/01/rdf-schema#comment') {
    //         if (parsedOntology.classes[subject]) {
    //           parsedOntology.classes[subject].comment = object;
    //         } else if (parsedOntology.properties[subject]) {
    //           parsedOntology.properties[subject].comment = object;
    //         }
    //       } else if (predicate === 'http://www.w3.org/2000/01/rdf-schema#label') {
    //         if (parsedOntology.classes[subject]) {
    //           parsedOntology.classes[subject].label = object;
    //         } else if (parsedOntology.properties[subject]) {
    //           parsedOntology.properties[subject].label = object;
    //         }
    //       }
    //     }
    //   });
    
    //   console.log("Parsed Ontology:", parsedOntology);
    
    //   // --- 2. Extract and Analyze the SPARQL Query ---
    //   const sparqlMatch = sqlSelectQuery.match(/SPARQL_TABLE\('(.*?)'\)/s);
    //   if (!sparqlMatch) {
    //     console.error("Could not extract SPARQL query.");
    //     MessageToast.show("Could not extract SPARQL query. Data might not be suitable for visualization.");
    //     return new sap.ui.model.json.JSONModel({ nodes: [], lines: [], groups: [] });
    //   }
    //   const sparqlQuery = sparqlMatch[1];
    
    //   const selectVarsMatch = sparqlQuery.match(/SELECT\s+(.*?)\s+FROM/s);
    //   const whereClauseMatch = sparqlQuery.match(/WHERE\s+\{(.*?)\}/s);
    
    //   const selectedVariables = selectVarsMatch ? selectVarsMatch[1].trim().split(/\s+/) : [];
    //   const whereTriples = whereClauseMatch ? whereClauseMatch[1].trim().split(/\.\s*/) : [];
    
    //   const involvedEntities = new Set();
    //   const relationships = [];
    
    //   // Identify classes and properties from the SPARQL query
    //   whereTriples.forEach(triple => {
    //     const parts = triple.trim().split(/\s+/);
    //     if (parts.length === 3) {
    //       const subject = parts[0];
    //       const predicate = parts[1];
    //       const object = parts[2];
    
    //       if (predicate === 'a' || predicate === 'rdf:type') {
    //         involvedEntities.add(object.replace(/[<>]/g, '')); // It's a class
    //       } else if (predicate.startsWith(':') || predicate.startsWith('<http://www.semanticweb.org/')) {
    //         relationships.push({ subject, predicate, object });
    //       }
    //       involvedEntities.add(subject);
    //       involvedEntities.add(object);
    //     }
    //   });
    
    //   selectedVariables.forEach(variable => involvedEntities.add(variable));
    
    //   const entityLabels = {};
    //   for (const entity of involvedEntities) {
    //     const entityUri = entity.replace(/[<>]/g, '');
    //     if (parsedOntology.classes[entityUri] && parsedOntology.classes[entityUri].label) {
    //       entityLabels[entity] = parsedOntology.classes[entityUri].label;
    //     } else if (parsedOntology.properties[entityUri] && parsedOntology.properties[entityUri].label) {
    //       entityLabels[entity] = parsedOntology.properties[entityUri].label;
    //     } else {
    //       entityLabels[entity] = entity.startsWith(':') ? entity.substring(1) : entity.split('/').pop();
    //     }
    //   }
    
    //   console.log("Involved Entities:", involvedEntities);
    //   console.log("Relationships:", relationships);
    //   console.log("Entity Labels:", entityLabels);
    
    //   // --- 3. Generate Nodes ---
    //   for (const entity of involvedEntities) {
    //     const entityUri = entity.replace(/[<>]/g, '');
    //     const label = entityLabels[entity];
    //     let shape = "Circle";
    //     if (parsedOntology.classes[entityUri]) {
    //       shape = "Box"; // Assuming identified classes are boxes
    //     }
    //     createNode(entityUri, { label, shape });
    //   }
    
    //   // --- 4. Generate Lines ---
    //   relationships.forEach(({ subject, predicate, object }) => {
    //     const subjectUri = subject.replace(/[<>]/g, '');
    //     const objectUri = object.replace(/[<>]/g, '');
    //     const predicateUri = predicate.replace(/[<>]/g, '');
    
    //     if (nodeKeys[subjectUri] && nodeKeys[objectUri]) {
    //       const propertyLabel = parsedOntology.properties[predicateUri]?.label || predicateUri.split('/').pop() || predicateUri;
    //       lines.push({ from: nodeKeys[subjectUri], to: nodeKeys[objectUri], label: propertyLabel });
    //     }
    //   });
    
    //   return new sap.ui.model.json.JSONModel({
    //     nodes: nodes, // The label is already set in the createNode function
    //     lines: lines,
    //     groups: groups
    //   });
    // }

    function generateNetworkGraphModel(sqlSelectQuery, ontologyTTL) {
      const nodes = [];
      const lines = [];
      const groups = [];
      const nodeKeys = {};
      let nextNodeKey = 1;
    
      // --- Helper functions (same as before) ---
      function getUniqueNodeKey(identifier) {
        if (!nodeKeys[identifier]) {
          nodeKeys[identifier] = String(nextNodeKey++);
        }
        return nodeKeys[identifier];
      }
    
      function createNode(entityOrClassUri, details = {}) {
        if (nodeKeys[entityOrClassUri]) {
          return nodeKeys[entityOrClassUri];
        }
        const key = getUniqueNodeKey(entityOrClassUri);
        nodes.push({ key, title: details.label || entityOrClassUri.split('/').pop(), label: details.label || entityOrClassUri.split('/').pop(), icon: details.icon || "sap-icon://circle-task-2", status: "Success", shape: details.shape || "Circle", group: details.group });
        return key;
      }
    
      // --- 1. Parse the Ontology TTL (same as before) ---
      const parsedOntology = { classes: {}, properties: {} };
      const ttlLines = ontologyTTL.split('\n').filter(line => line.trim() && !line.startsWith('@prefix'));
    
      ttlLines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const subject = parts[0].replace(/[<>]/g, '');
          const predicate = parts[1].replace(/[<>]/g, '');
          const object = parts[2].replace(/[<>"']/g, '');
    
          if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
            if (object === 'http://www.w3.org/2002/07/owl#Class') {
              parsedOntology.classes[subject] = parsedOntology.classes[subject] || {};
            } else if (object === 'http://www.w3.org/2002/07/owl#ObjectProperty') {
              parsedOntology.properties[subject] = { type: 'object' };
            } else if (object === 'http://www.w3.org/2002/07/owl#DatatypeProperty') {
              parsedOntology.properties[subject] = { type: 'datatype' };
            }
          } else if (predicate === 'http://www.w3.org/2000/01/rdf-schema#comment') {
            if (parsedOntology.classes[subject]) {
              parsedOntology.classes[subject].comment = object;
            } else if (parsedOntology.properties[subject]) {
              parsedOntology.properties[subject].comment = object;
            }
          } else if (predicate === 'http://www.w3.org/2000/01/rdf-schema#label') {
            if (parsedOntology.classes[subject]) {
              parsedOntology.classes[subject].label = object;
            } else if (parsedOntology.properties[subject]) {
              parsedOntology.properties[subject].label = object;
            }
          }
        }
      });
    
      console.log("Parsed Ontology:", parsedOntology);
    
      // --- 2. Extract and Analyze the SPARQL Query ---
      // Modified regex to be more lenient with whitespace and newlines
      const sparqlMatch = sqlSelectQuery.match(/SPARQL_TABLE\s*\(\s*'([\s\S]*?)'\s*\)/i);
      if (!sparqlMatch || !sparqlMatch[1]) {
        console.error("Could not extract SPARQL query.");
        return new sap.ui.model.json.JSONModel({ nodes: [], lines: [], groups: [] });
      }
      const sparqlQuery = sparqlMatch[1];
    
      const selectVarsMatch = sparqlQuery.match(/SELECT\s+(.*?)\s+FROM/si);
      const whereClauseMatch = sparqlQuery.match(/WHERE\s+\{(.*?)\}/si);
    
      const selectedVariables = selectVarsMatch ? selectVarsMatch[1].trim().split(/\s+/) : [];
      const whereTriples = whereClauseMatch ? whereClauseMatch[1].trim().split(/\.\s*/) : [];
    
      const involvedEntities = new Set();
      const relationships = [];
    
      // Identify classes and properties from the SPARQL query
      whereTriples.forEach(triple => {
        const parts = triple.trim().split(/\s+/);
        if (parts.length === 3) {
          const subject = parts[0];
          const predicate = parts[1];
          const object = parts[2];
    
          if (predicate === 'a' || predicate === 'rdf:type') {
            involvedEntities.add(object.replace(/[<>]/g, '')); // It's a class
          } else if (predicate.startsWith(':') || predicate.startsWith('<http://www.semanticweb.org/')) {
            relationships.push({ subject, predicate, object });
          }
          involvedEntities.add(subject);
          involvedEntities.add(object);
        }
      });
    
      selectedVariables.forEach(variable => involvedEntities.add(variable));
    
      const entityLabels = {};
      for (const entity of involvedEntities) {
        const entityUri = entity.replace(/[<>]/g, '');
        if (parsedOntology.classes[entityUri] && parsedOntology.classes[entityUri].label) {
          entityLabels[entity] = parsedOntology.classes[entityUri].label;
        } else if (parsedOntology.properties[entityUri] && parsedOntology.properties[entityUri].label) {
          entityLabels[entity] = parsedOntology.properties[entityUri].label;
        } else {
          entityLabels[entity] = entity.startsWith(':') ? entity.substring(1) : entity.split('/').pop();
        }
      }
    
      console.log("Involved Entities:", involvedEntities);
      console.log("Relationships:", relationships);
      console.log("Entity Labels:", entityLabels);
    
      // --- 3. Generate Nodes ---
      for (const entity of involvedEntities) {
        const entityUri = entity.replace(/[<>]/g, '');
        const label = entityLabels[entity];
        let shape = "Circle";
        if (parsedOntology.classes[entityUri]) {
          shape = "Box"; // Assuming identified classes are boxes
        }
        createNode(entityUri, { label, shape });
      }
    
      // --- 4. Generate Lines ---
      relationships.forEach(({ subject, predicate, object }) => {
        const subjectUri = subject.replace(/[<>]/g, '');
        const objectUri = object.replace(/[<>]/g, '');
        const predicateUri = predicate.replace(/[<>]/g, '');
    
        if (nodeKeys[subjectUri] && nodeKeys[objectUri]) {
          const propertyLabel = parsedOntology.properties[predicateUri]?.label || predicateUri.split('/').pop() || predicateUri;
          lines.push({ from: nodeKeys[subjectUri], to: nodeKeys[objectUri], label: propertyLabel });
        }
      });
    
      return new sap.ui.model.json.JSONModel({
        nodes: nodes,
        lines: lines,
        groups: groups
      });
    }
    
    // --- Example Usage ---
    const exampleSqlSelectQuery = `
    WITH TABLE_KG AS (
SELECT *
FROM SPARQL_TABLE('
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix : <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology/>
prefix owl: <http://www.w3.org/2002/07/owl#>
prefix foaf: <http://xmlns.com/foaf/0.1/>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?partner ?pbcOrderNumber
FROM <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-rdf-v4>
FROM <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-inferred-triples-v4>
WHERE {
?partner a :SAPPartner .
?partner :requested ?serviceRequest .
?serviceRequest :consistsOf ?service .
?service :hasPBCOrderNumber ?pbcOrderNumber .
}
')
)
SELECT
"TABLE_KG".*
FROM TABLE_KG
    `;
    // const exampleSqlSelectQuery = `
    // WITH TABLE_KG AS (
    // SELECT *
    // FROM SPARQL_TABLE('
    // prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    // prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    // prefix : <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology/>
    // prefix owl: <http://www.w3.org/2002/07/owl#>
    // prefix foaf: <http://xmlns.com/foaf/0.1/>
    // prefix xsd: <http://www.w3.org/2001/XMLSchema#>
    // SELECT ?pbcOrderNumber ?sapEmployee
    // FROM <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-rdf-v4>
    // FROM <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-inferred-triples-v4>
    // WHERE {
    // ?serviceRequest a :SAPServiceRequest;
    // :hasUseCase ?useCase;
    // :requestDate ?date.
    // ?useCase a :UseCase;
    // :isBTPUseCase true.
    // ?service a :SAPService;
    // :relatesToServiceRequest ?serviceRequest;
    // :hasPBCOrderNumber ?pbcOrderNumber;
    // :deliveredBy ?sapEmployee.
    // FILTER (?date >= "2024-01-01"^^xsd:date && ?date < "2025-01-01"^^xsd:date)
    // }
    // ')
    // )
    // SELECT
    // "TABLE_KG".*
    // FROM TABLE_KG
    // `;
    
    const completeOntologyTTL = `@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
    @prefix owl: <http://www.w3.org/2002/07/owl#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix : <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology/>.
    
    :SAPPartner :accountName xsd:string .
    :UseCase :aiScenarioType :SAPAIScenario .
    :SAPServiceRequest :belongsToIndustry :Industry .
    :SAPServiceRequest :belongsToSAPProgram :SAPProgramInitiative .
    :Country :belongsToSAPRegion :SAPRegion .
    :UseCase :belongsToServiceRequest :SAPServiceRequest .
    :UseCase :btpScenarioType :SAPBTPScenario .
    :SAPService :completionDate xsd:date .
    :SAPServiceRequest :consistsOf :SAPService .
    :Country :countryCode xsd:string .
    :SAPServiceRequest :coversProduct :Product .
    :SAPService :deliveredBy :SAPEmployee .
    :SAPServiceRequest :executedBy :SAPEmployee .
    :UseCase :hasCustomer xsd:boolean .
    :UseCase :hasGTMOutcome :GTMOutcome .
    :SAPServiceRequest :hasGTMRoute :GTMRoute .
    :SAPService :hasPBCOrderNumber xsd:string .
    :SAPServiceRequest :hasPartnerContact :SAPPartnerEmployee .
    :SAPPartner :hasPartnerType :SAPPartnerType .
    :SAPPartner :hasPartnershipType :SAPPartnershipType .
    :SAPServiceType :hasSAPContact :SAPEmployee .
    :SAPServiceRequest :hasSolution xsd:boolean .
    :UseCase :hasTitle xsd:string .
    :SAPServiceRequest :hasUseCase :UseCase .
    :UseCase :isAIUseCase xsd:boolean .
    :UseCase :isBTPUseCase xsd:boolean .
    :SAPServiceRequest :isDeleted xsd:boolean .
    :SAPService :isFreeService xsd:boolean .
    :SAPPartner :isGSSP xsd:boolean .
    :Product :legalIPOwner xsd:string .
    :SAPPartner :ofCountry :Country .
    :SAPPartner :partnerStatus xsd:string .
    :UseCase :plannedGoLiveDate xsd:date .
    :Product :productName xsd:string .
    :Product :productPublicName xsd:string .
    :Product :productType xsd:string .
    :SAPServiceRequest :relatesToLoB :LoB .
    :SAPService :relatesToServiceRequest :SAPServiceRequest .
    :SAPServiceRequest :requestDate xsd:date .
    :SAPPartner :requested :SAPServiceRequest .
    :SAPServiceRequest :requestedBy :SAPPartner .
    :SAPServiceRequest :requiredSupport :RequiredSupport .
    :SAPService :revenue xsd:float .
    :SAPService :serviceType :SAPServiceType .
    :Product :solutionArea xsd:string .
    :Product :solutionSubArea xsd:string .
    :SAPServiceRequest :sourceOfRequest :SourceOfRequest .
    :SAPService :startDate xsd:date .
    :UseCase :useCaseStatus xsd:string .
    :SAPServiceRequest :wasInitiatedBy :SAPServiceRequestInitiator .
    :SAPServiceRequest a owl:Class ; rdfs:comment "Formal coaching request sent by an SAP partner to SAP. A single request may be used to request multiple services."@en .
    :UseCase a owl:Class ; rdfs:comment "Use case attached to the partner service request."@en .
    :solutionArea a owl:DatatypeProperty ; rdfs:comment "It indicates the solution area of the product. It can have the following values:\n\"HXM\"\n\"BPI\"\n\"BTP\"\n\"S4\"\n\"CX\"\n\"WCM\"\n\"Cross\"\n\"XM\"\n\"ISBN\""@en .
    :hasValue a owl:DatatypeProperty ; rdfs:comment "This property states the name or type or value assumed by an instance."@en .
    :category a owl:DatatypeProperty ; rdfs:comment "It indicates the category of the object it refers to."@en .
    :completionDate a owl:DatatypeProperty ; rdfs:comment "It is a property of the service class. It indicates the date of completion of the requested service."@en .
    :hasDescription a owl:DatatypeProperty ; rdfs:comment "This property is used to provide the description of the use case or SAP organization or the service offered by SAP."@en .
    :hasTitle a owl:DatatypeProperty ; rdfs:comment "It indicates the title of the use case associated to the service request."@en .
    :isBTPUseCase a owl:DatatypeProperty ; rdfs:comment "It marks whether the use case involves BTP or not."@en .
    :isFreeService a owl:DatatypeProperty ; rdfs:comment "It marks whether the requested service is paid or free."@en .
    :legalIPOwner a owl:DatatypeProperty ; rdfs:comment "It indicates the legal owner of the intellectual property of a certain product."@en .
    :partnerStatus a owl:DatatypeProperty ; rdfs:comment "It indicates the status of the SAP partner. It can have the following values:\n\"Prospective Partner\"\n\"Active\"\n\"Discontinued\""@en .
    :plannedGoLiveDate a owl:DatatypeProperty ; rdfs:comment "It indicates the planned go-live date of the solution (if specified) that the service request helped develop."@en .
    :productName a owl:DatatypeProperty ; rdfs:comment "It indicates the name of the software product."@en .
    :productPublicName a owl:DatatypeProperty ; rdfs:comment "It indicates the public name of the product."@en .
    :productType a owl:DatatypeProperty ; rdfs:comment "It indicates the type of the product. It can be:\n\"SAP Product\"\n\"3rd Party Product\"\n\"Service\"\n\"Users and Unallocated\""@en .
    :revenue a owl:DatatypeProperty ; rdfs:comment "It indicates the revenue earned from the delivery of a certain service."@en .
    :startDate a owl:DatatypeProperty ; rdfs:comment "It is a property of the service class. It indicates the date the delivery of the requested service began."@en .
    :SAPEmployee a owl:Class ; rdfs:comment "Person that is employed by SAP and that is involved in the coaching services."@en .
    :GTMOutcome a owl:Class ; rdfs:comment "Outcome of the Go-to-Market process if there is one related to the service request submitted."@en .
    :RequiredSupport a owl:Class ; rdfs:comment "Type of support required for the service."@en .
    :SourceOfRequest a owl:Class ; rdfs:comment "Channels through which the request can arrive. It can be:\n'PCD E-Mail'\n'PBC request'\n'Internal'\n'Others'"@en .
    :SAPServiceRequestInitiator a owl:Class ; rdfs:comment "Who initiated the service request. It can be:\n'SAP'\n'Customer'\n'Partner'"@en .
    :belongsToSAPRegion a owl:ObjectProperty ; rdfs:comment "It is a property of the country. It indicates the SAP business region the country belongs to."@en .
    :btpScenarioType a owl:ObjectProperty ; rdfs:comment "It is a property of the use case. It indicates the use case associated to the service request is related to a specific BTP Scenario."@en .
    :hasGTMRoute a owl:ObjectProperty ; rdfs:comment "It is a property of the service request. It indicates the Go-to-Market result that the service request intends to produce."@en .
    :hasPartnerContact a owl:ObjectProperty ; rdfs:comment "It indicates the partner contact person for the service request"@en .
    :isEmployedBy a owl:ObjectProperty ; rdfs:comment "It indicates which company the employee is employed by."@en .
    :requiredSupport a owl:ObjectProperty ; rdfs:comment "It is a property of the service request class. It indicates the type of support required in the service request in the context of the associated use case."@en .
    :category a owl:ObjectProperty ; rdfs:comment "It indicates the category of the object it refers to."@en .
    :isBTPUseCase a owl:ObjectProperty ; rdfs:comment "It marks whether the use case involves BTP or not."@en .
    :productName a owl:ObjectProperty ; rdfs:comment "It indicates the name of the software product."@en .
    :productPublicName a owl:ObjectProperty ; rdfs:comment "It indicates the public name of the product."@en .
    :revenue a owl:ObjectProperty ; rdfs:comment "It indicates the revenue earned from the delivery of a certain service."@en .
    :startDate a owl:ObjectProperty ; rdfs:comment "It is a property of the service class. It indicates the date the delivery of the requested service began."@en .
    :COILExpert a owl:Class ; rdfs:comment "Class of SAP employees that are member of the SAP Co-Innovation Lab, an SAP organization that helps SAP partners to convert ideas for solutions for intelligent enterprises into working prototypes and from there to market-ready solutions."@en .
    :involvedIn a owl:ObjectProperty ; rdfs:comment "It indicates the person who is involed in some way in the service request."@en .
    :UseCase a owl:Class ; rdfs:comment "Use case attached to the partner service request."@en .
    :Country a owl:Class ; rdfs:comment "Country where the service is delivered or country of provenance of the partner."@en .
    :GTMRoute a owl:Class ; rdfs:comment "Go-to-Market process expected for the submitted service request."@en .
    :Product a owl:Class ; rdfs:comment "Software product involved in the use case associated to the partner service request."@en .
    :SAPServiceType a owl:Class ; rdfs:comment "Type of service requested to SAP."@en .
    :SAPAIScenario a owl:Class ; rdfs:comment "Class of the possible AI scenarios in the SAP domain. It can be:\n'Embedded AI'\n'BTP AI'\n'3rd Party AI'"@en .
    :requestedBy a owl:ObjectProperty ; rdfs:comment "It is a property of the service request class. It indicates who requested the service request."@en .
    :belongsToIndustry a owl:ObjectProperty ; rdfs:comment "It is a property of the service request. It indicates the service request belongs to one or more industries (this is because the use case does)."@en .
    :consistsOf a owl:ObjectProperty ; rdfs:comment "It indicates the service requested through the service request."@en .
    :hasGTMOutcome a owl:ObjectProperty ; rdfs:comment "It is a property of the use case. It indicates the Go-To-Market result the service request produced."@en .
    :hasPartnershipType a owl:ObjectProperty ; rdfs:comment "It is a property of the partner class. It specifies the type of partnership existing between SAP and a partner."@en .
    :relatesToLoB a owl:ObjectProperty ; rdfs:comment "It indicates the line of business the use case associated with the service request refers to."@en .
    :serviceType a owl:ObjectProperty ; rdfs:comment "It specifies the type of the requested service through a service request."@en .
    :belongsToServiceRequest a owl:ObjectProperty ; rdfs:comment "It indicates the service request the use case is associated to."@en .
    :accountName a owl:ObjectProperty ; rdfs:comment "It specifies the account name of the SAP partner."@en .
    :countryCode a owl:ObjectProperty ; rdfs:comment "It indicates the country code (in the ISO 3166-1 alpha-2 standard) of the country."@en .
    :createdOnDate a owl:ObjectProperty ; rdfs:comment "It indicates the date the object was created (datetime) in the system."@en .
    :hasCustomer a owl:ObjectProperty ; rdfs:comment "It marks whether the use case has already a customer or not."@en .
    :hasID a owl:ObjectProperty ; rdfs:comment "It indicates the unique identifier of the object in the source table fo the original relational data model."@en .
    :hasStatus a owl:ObjectProperty ; rdfs:comment "It states the status of the service request or of the requested services. It can have the following values:\n'requested'/'submitted'\n'accepted'\n'rejected'\n'in progress'\n'completed'\n'discontinued'\n'canceled'"@en .
    :isAIUseCase a owl:ObjectProperty ; rdfs:comment "It marks whether the use case is around AI or not."@en .
    :hasSolution a owl:ObjectProperty ; rdfs:comment "Flag indicating whether the service request produced a solution."@en .
    :isDeleted a owl:ObjectProperty ; rdfs:comment "Flag that states if the service request is deleted or not."@en .
    :isGSSP a owl:ObjectProperty ; rdfs:comment "It marks whether an SAP partner is GSSP (global strategic service partner) or not."@en .
    :modifiedOnDate a owl:ObjectProperty ; rdfs:comment "It indicates the date the object was modified (datetime) in the system."@en .
    :SAPServiceRequest a owl:Class ; rdfs:comment "Formal coaching request sent by an SAP partner to SAP. A single request may be used to request multiple services."@en .
    :relatesToServiceRequest a owl:ObjectProperty ; rdfs:comment "It is a property of the service class. It indicates the service request the service belongs to."@en .
    :SAPPartnerType a owl:Class ; rdfs:comment "Type of SAP partner."@en .
    :SAPPartner a owl:Class ; rdfs:comment "Company that is in a certain business relationship with SAP"@en .
    :SAPProgramInitiative a owl:Class ; rdfs:comment "SAP program initiative to which the request is associated."@en .
    :SAPRegion a owl:Class ; rdfs:comment "Class of SAP business regions."@en .
    :solutionArea a owl:ObjectProperty ; rdfs:comment "It indicates the solution area of the product. It can have the following values:\n\"HXM\"\n\"BPI\"\n\"BTP\"\n\"S4\"\n\"CX\"\n\"WCM\"\n\"Cross\"\n\"XM\"\n\"ISBN\""@en .
    :createdBy a owl:ObjectProperty ; rdfs:comment "It indicates who created the object in the SAP system."@en .
    :deliveredBy a owl:ObjectProperty ; rdfs:comment "It indicates who delivered the service to the partner"@en .
    :executedBy a owl:ObjectProperty ; rdfs:comment "It indicates who executed the service request"@en .
    :hasSAPContact a owl:ObjectProperty ; rdfs:comment "It is a property of the service type class. It indicates the responsible person in SAP (identified by his email address) for the service type offered."@en .
    :requested a owl:ObjectProperty ; rdfs:comment "It indicates the service request the SAP partner requested."@en .
    :hasValue a owl:ObjectProperty ; rdfs:comment "This property states the name or type or value assumed by an instance."@en .
    :sourceOfRequest a owl:ObjectProperty ; rdfs:comment "It is a property of the service request class. It indicates which channel the service request originated from. It can be:\n'PCD E-Mail'\n'PBC request'\n'Internal'\n'Others'"@en .
    :belongsToSAPProgram a owl:ObjectProperty ; rdfs:comment "It is a property of the service request. It indicates the service request belongs to a SAP program initiative."@en .
    :wasInitiatedBy a owl:ObjectProperty ; rdfs:comment "It is a property of the service request class. It indicates who initiated the service request. It can be:\n'SAP'\n'Customer'\n'Partner'"@en .
    :completionDate a owl:ObjectProperty ; rdfs:comment "It is a property of the service class. It indicates the date of completion of the requested service."@en .
    :hasDescription a owl:ObjectProperty ; rdfs:comment "This property is used to provide the description of the use case or SAP organization or the service offered by SAP."@en .
    :hasTitle a owl:ObjectProperty ; rdfs:comment "It indicates the title of the use case associated to the service request."@en .
    :isFreeService a owl:ObjectProperty ; rdfs:comment "It marks whether the requested service is paid or free."@en .
    :legalIPOwner a owl:ObjectProperty ; rdfs:comment "It indicates the legal owner of the intellectual property of a certain product."@en .
    :partnerStatus a owl:ObjectProperty ; rdfs:comment "It indicates the status of the SAP partner. It can have the following values:\n\"Prospective Partner\"\n\"Active\"\n\"Discontinued\""@en .
    :plannedGoLiveDate a owl:ObjectProperty ; rdfs:comment "It indicates the planned go-live date of the solution (if specified) that the service request helped develop."@en .
    :productType a owl:ObjectProperty ; rdfs:comment "It indicates the type of the product. It can be:\n\"SAP Product\"\n\"3rd Party Product\"\n\"Service\"\n\"Users and Unallocated\""@en .
    :BTPSolutionArchitect a owl:Class ; rdfs:comment "Team of BTP solution architects in SAP who are mandated to coach and guide SAP partners in implementing their solution on BTP."@en .
    :SAPPartnerContact a owl:Class ; rdfs:comment "A partner employee responsible of the service request on the partner side."@en .
    :SAPService a owl:Class ; rdfs:comment "Service requested via service request from SAP partner. It is possible that multiple services are associated with the same service request."@en .
    :SAPPartnerEmployee a owl:Class ; rdfs:comment "Person employed by an SAP Partner."@en .
    :SAPPartnershipType a owl:Class ; rdfs:comment "Type of partnership existing between and organization and SAP."@en .
    :SAPOrganization a owl:Class ; rdfs:comment "Organized group of people in SAP with a particular purpose"@en .
    :Industry a owl:Class ; rdfs:comment "Industry to which the use case is related to."@en .
    :LoB a owl:Class ; rdfs:comment "Line of businesses the use case is related to."@en .
    :involves a owl:ObjectProperty ; rdfs:comment "It indicates the service request or service involves a certain person."@en .
    :aiScenarioType a owl:ObjectProperty ; rdfs:comment "It is a property of the use case. It indicates the service request concerns a certain use case that is related to a specific AI Scenario."@en .
    :hasPartnerType a owl:ObjectProperty ; rdfs:comment "It is a property of the partner class. Specifies what type of partner the specific organization is for SAP."@en .
    :modifiedBy a owl:ObjectProperty ; rdfs:comment "It indicates who modified the object in the SAP system."@en .
    :responsiblePerson a owl:ObjectProperty ; rdfs:comment "Indicates the responsible person in SAP for a certain service or organization."@en .
    :ofCountry a owl:ObjectProperty ; rdfs:comment "It indicates the country of provenance of the SAP partner."@en .
    :hasPBCOrderNumber a owl:ObjectProperty ; rdfs:comment "It indicates the unique  PBC order number of the service (if the service was requested through the Parter Benefits Catalog)."@en .
    :solutionSubArea a owl:ObjectProperty ; rdfs:comment "It indicates the solution subarea of the product. It can have the following values:\n\"Business Network\"\n\"Business Process Intelligence\"\n\"Commerce\"\n\"Core HR and Payroll\"\n\"Cross Business Services\"\n\"Customer Data Solutions\"\n\"Database and Data Management\"\n\"Digital Supply Chain\"\n\"ERP for SME\"\n\"Enterprise Cloud Services (IaaS)\"\n\"Experience Management\"\n\"External Workforce\"\n\"Finance, Q2C and Enterprise Mgmt\"\n\"Foundation/Appl. Dev. & Integration\"\n\"IBSO Projects\"\n\"Industry-specific Applications\"\n\"Learning and Talent\"\n\"Marketing\"\n\"Others\"\n\"Planning and Analytics\"\n\"Premium Engagements\"\n\"Procurement\"\n\"Qualtrics EX\"\n\"Sales Performance Management\"\n\"Sales and Services\"\n\"SuccessFactors Cross\"\n\"Taulia\"\n\"Training and Adoption\"\n\"Travel and Expense\""@en .
    :useCaseStatus a owl:ObjectProperty ; rdfs:comment "It indicates the status of the use case associated to the partner service request. It can take on one of the following values:\n'in progress'\n'completed'\n'discontinued'\n'not yet started'" .
    :hasName a owl:ObjectProperty ; rdfs:comment "This property indicates the proper name of an object."@en .
    :coversProduct a owl:ObjectProperty ; rdfs:comment "It is a property of the service request. It indicates the product involved in the use case that is associated to the service request."@en .
    :requestDate a owl:ObjectProperty ; rdfs:comment "It is a property of the service request class. It indicates the date the service request was submitted."@en .
    :SAPEmployee rdfs:subClassOf foaf:Person .
    :SAPEmployee rdfs:subClassOf :Person .
    :BTPSolutionArchitect rdfs:subClassOf :SAPEmployee .
    :COILExpert rdfs:subClassOf :SAPEmployee .
    :SAPPartnerEmployee rdfs:subClassOf foaf:Person .
    :SAPPartnerEmployee rdfs:subClassOf :Person .
    :SAPEmployee rdfs:subClassOf foaf:Agent .
    :SAPPartner rdfs:subClassOf foaf:Organization .
    :SAPPartnerContact rdfs:subClassOf :SAPPartnerEmployee .
    :SAPPartnerEmployee rdfs:subClassOf foaf:Agent .
    :SAPOrganization rdfs:subClassOf foaf:Organization .`;

    // const networkGraphModel = generateNetworkGraphModel(exampleSqlSelectQuery, completeOntologyTTL);
    // console.log(networkGraphModel.getData());

    return BaseController.extend("chat.controller.App", {
      dKeyPressCount: 0,
      handleKeyDown: function (event) {
        if (event.key.toLowerCase() === 'd') { // Case-insensitive check
          this.dKeyPressCount++;

          if (this.dKeyPressCount === 5) {
            // Trigger your action here
            console.log("D key pressed 5 times!");
            // alert("You pressed 'd' 5 times!");
            // this.myCustomFunction(); // Call a controller function
            let isVisible = sap.ui.getCore().byId("container-chat---App--jouleBtn").getVisible();
            sap.ui.getCore().byId("container-chat---App--jouleBtn").setVisible(!isVisible);
            let isWelcomeVisible = sap.ui.getCore().byId("container-chat---App--FPage1Welcome--jouleWelcomeBtn").getVisible();
            sap.ui.getCore().byId("container-chat---App--FPage1Welcome--jouleWelcomeBtn").setVisible(!isWelcomeVisible);

            this.dKeyPressCount = 0; // Reset counter (optional)

            MessageToast.show("💎 Joule (un)locked! 🤫");
          }
        } else {
          // Reset if you want 5 'd's in a row
          // this.dKeyPressCount = 0;
        }
      },
      onJoule: function () {
        if (document.getElementById("cai-webclient-main").style.display == "block") {
          document.getElementById("cai-webclient-main").style.display = "none";
        } else {
          document.getElementById("cai-webclient-main").style.display = "block";
        }
      },
      onGridListItemPressForProjectDetails: async function (oEvent) {
        /** Logic for Project Details
         * - Retrieve Project ID
         * - GET request to get Project Details
         * - Parse response into JSON into fragment
         */

        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().oBindingContexts.search.sPath);
        // console.log(gridlistitemcontextdata);
        var projID = gridlistitemcontextdata.project_number;

        const getprojdeturl = PROJECT_DETAILS_EP + '?project_number=' + projID;
        const getprojdetoptions = { method: 'GET' };

        try {
          const response = await fetch(getprojdeturl, getprojdetoptions);
          const data = await response.json();

          const project_number = data.project_details[0].project_number;
          const topic = data.project_details[0].topic;
          const architect = data.project_details[0].architect;
          const comment = data.project_details[0].comment;
          const comment_date = data.project_details[0].comment_date;
          const project_date = data.project_details[0].project_date;
          const solution = data.project_details[0].solution;


          const elements1 = [
            { label: "Request Date", value: project_date },
            { label: "Solution", value: solution },
            { label: "Architect", value: architect },
            { label: "Comments", value: comment },
            { label: "Comments Date", value: comment_date },
          ];

          const json1 = createPageJson(
            "Request #" + project_number,
            topic,
            COINSTAR_URL,
            "sap-icon://travel-request",
            elements1
          );

          var oModel = new JSONModel(json1);
          this.getView().setModel(oModel, "pages");

          var oModel = this.getView().getModel("pages");
          this.openQuickView(oEvent, oModel);

        } catch (error) {
          console.error("In onGridListItemPressForProjectDetails:");
          console.error(error);
          MessageToast.show("Uh-oh, unable to retrieve project details.");
        }

      },
      expandSparqlqueryTextArea: function () {
        var oPanel = this.byId("FPage7EnhancedAdvisoryBuddy--expandablePanel");
        oPanel.setExpanded(!oPanel.getExpanded());
      },

      onRefreshSparqlQueryOnly: function (evt) {
        // Get the new state of the switch (true/false)
        var bState = evt.getParameter("state");

        var method = this.getView().byId("methodSelect").getSelectedKey();

        // Show message toast
        // MessageToast.show("Switch state changed to: " + (bState ? "On" : "Off"));
        // You're in EDIT mode of the SPARQL query.

        // You can perform additional actions based on the switch state
        if (bState) {
          var oPanel = this.byId("FPage7EnhancedAdvisoryBuddy--expandablePanel");
          oPanel.setExpanded(false);

          // Actions when switch is turned ON
          MessageToast.show("Regenerating SPARQL query, table will be refreshed!");

          this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").setEditable(false);
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setBusy(true);

          var newSparqlValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").getValue();

          var sUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/execute_query_raw";
          var sKGSemanticsSQLUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/execute_query_raw?query_type=sql";

          var that = this;

          if (method === "2") {
            //  KG only
            $.ajax({
              url: sUrl,
              type: "POST",
              contentType: "text/plain",  // Set content type to text/plain for the SPARQL query
              data: newSparqlValue,               // Send the query as plain text
              success: function (oData) {
                that.processResponse(oData);
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setBusy(false);
              },
              error: function (oError) {
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setBusy(false);
                MessageToast.show("Error loading data: " + oError.statusText);
                console.error("Error loading data:", oError);
              }
            });
  
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Success");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Success");

            const networkGraphModel = generateNetworkGraphModelFromSparql(newSparqlValue, completeOntologyTTL);
            this.getView().setModel(networkGraphModel, "kgresults");

          } else {
            //  KG + Semantics
            $.ajax({
              url: sKGSemanticsSQLUrl,
              type: "POST",
              contentType: "text/plain",  // Set content type to text/plain for the SPARQL query
              data: newSparqlValue,               // Send the query as plain text
              success: function (oData) {
                that.processNewResponse(oData);
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setBusy(false);
              },
              error: function (oError) {
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setBusy(false);
                MessageToast.show("Error loading data: " + oError.statusText);
                console.error("Error loading data:", oError);
              }
            });

            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Success");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2a").setStatus("Success");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2b").setStatus("Success");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Success");

            const networkGraphModel = generateNetworkGraphModel(newSparqlValue, completeOntologyTTL);
            this.getView().setModel(networkGraphModel, "kgresults");

          }
        } else {
          if (method === "2") {
            //  KG only
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Warning");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Warning");
          } else {
            //  KG + Semantics
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Warning");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2a").setStatus("Warning");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2b").setStatus("Warning");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Warning");
            this.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setBusy(false);
          }
          // Actions when switch is turned OFF
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").setEditable(true);
          MessageToast.show("You're in EDIT mode of the SPARQL query.");

          var oPanel = this.byId("FPage7EnhancedAdvisoryBuddy--expandablePanel");
          oPanel.setExpanded(true);
          

        }
      },
      onExecuteSparqlExplorer: function (evt) {
        // Get the new state of the switch (true/false) FPage8SparqlExplorer
        // var bState = evt.getParameter("state");

        // Show message toast
        // MessageToast.show("Switch state changed to: " + (bState ? "On" : "Off"));
        // You're in EDIT mode of the SPARQL query.

        // You can perform additional actions based on the switch state
        // MessageToast.show("Regenerating SPARQL query, table will be refreshed!");

        this.getView().byId("FPage8SparqlExplorer--sparqlExplorerResultsTable").setBusy(true);
        this.setAppBusy(true);

        var oModel = new JSONModel({
          results: [],
          columns: [],
          sparqlQuery: "",
          ontology: "http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology",
          dataSource: "http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-rdf3"
        });
        this.getView().setModel(oModel, "kgSparqlExplorerTable");

        var newSparqlValue = this.getView().byId("FPage8SparqlExplorer--generatedSparqlQueryForSparlExplorer").getValue();

        var sUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/execute_query_raw";

        var that = this;

        $.ajax({
          url: sUrl,
          type: "POST",
          contentType: "text/plain",  // Set content type to text/plain for the SPARQL query
          data: newSparqlValue,               // Send the query as plain text
          success: function (oData) {
            // Method 1: Format data and fit into defined table
            // var aFormattedData = that.formatResponseData(oData);
            // var oTable = new JSONModel(aFormattedData);
            // that.getView().setModel(oTable, "kgSparqlTable");
            // MessageToast.show("Data loaded successfully");

            // Method 2: Dynamic response to Dynamic Table (Moved outside)
            // var oModel = new JSONModel({
            //   results: [],
            //   columns: []
            // });


            that.processResponseForSparqlExplorer(oData);
            that.getView().byId("FPage8SparqlExplorer--sparqlExplorerResultsTable").setBusy(false);
            that.getView().byId("FPage8SparqlExplorer--sparqlExplorerResultsTable").setVisible(true);
            that.getView().byId("FPage8SparqlExplorer--outputIconTabBarForSparlExplorer").setVisible(true);
            var oPanel = that.byId("FPage8SparqlExplorer--expandablePanelForExplorer");
            oPanel.setExpanded(false);
            that.setAppBusy(false);


          },
          error: function (oError) {
            that.getView().byId("FPage8SparqlExplorer--sparqlExplorerResultsTable").setBusy(false);
            that.setAppBusy(false);
            MessageToast.show("Error loading data: " + oError.statusText);
            console.error("Error loading data:", oError);
          }
        });

      },

      onRefreshKGNaturalLanguage2Sparql: function () {
        var method = this.getView().byId("methodSelect").getSelectedKey();
        if (method === "2") {
          //  KG only
          var stripValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").getText();
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInput").setValue(stripValue);
          this.onKGNaturalLanguage2Sparql();
        } else {
          //  KG + Semantics
          var stripValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").getText();
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlKGSemanticsInput").setValue(stripValue);
          this.onKGSemantics2Sparql();
        }
      },

      onMethodChange: function (oEvent) {
        var method = oEvent.getParameters().selectedItem.getKey();
        console.log("Method changed to: " + method);
        if (method === "2") {
          //  KG only
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlKGSemanticsInput").setVisible(false);
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInput").setVisible(true);
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--refreshSparqlQueryOnly").setEnabled(true);

          var oModel = new sap.ui.model.json.JSONModel({
            nodes: [
              { key: "1", title: "Step 1: Ask Me Anything", icon: "sap-icon://headset", status: "Warning", shape: "Circle" },
              { key: "1a", title: "Step 2: Generate SPARQL query from user's entry", icon: "", status: "Warning", shape: "Box" },
              { key: "2", title: "Retrieve data using Knowledge Graph engine", icon: "sap-icon://instance", status: "Warning", shape: "Circle", group: "1" },
              { key: "3", title: "Step 4: Display and explore Knowledge Graph data & ontology", icon: "sap-icon://accept", status: "Warning", shape: "Circle" },
              
            ],
            lines: [
              { from: "1", to: "1a" },
              { from: "1a", to: "2" },
              { from: "2", to: "3" }
            ],
            groups: [{ key: "1", title: "Step 3: Use SAP Knowledge Graph engine" },] // Initialize groups array
          });
  
          this.getView().setModel(oModel, "processflow");
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").setCurrentZoomLevel(0.8);
        } else {
          //  KG + Semantics
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlKGSemanticsInput").setVisible(true);
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInput").setVisible(false);
          this.getView().byId("FPage7EnhancedAdvisoryBuddy--refreshSparqlQueryOnly").setEnabled(true);
          
          var oModel = new sap.ui.model.json.JSONModel({
            nodes: [
              { key: "1", title: "Step 1: Ask Me Anything", icon: "sap-icon://headset", status: "Warning", shape: "Circle" },
              { key: "1a", title: "Step 2: Generate SPARQL query from user's entry", icon: "", status: "Warning", shape: "Box" },
              { key: "2", group: "1", title: "Retrieve data using Knowledge Graph engine", icon: "sap-icon://instance", status: "Warning", shape: "Circle", group: "1" },
              { key: "2a", group: "1", title: "Vectorize user's entry", icon: "sap-icon://instance", status: "Warning", shape: "Circle" },
              { key: "2b", group: "1", title: "Execute similarity search with in-database embeddings", icon: "sap-icon://instance", status: "Warning", shape: "Circle", group: "1" },
              { key: "3", title: "Step 4: Display and explore Knowledge Graph data & ontology", icon: "sap-icon://accept", status: "Warning", shape: "Circle" },
              
            ],
            lines: [
              { from: "1", to: "1a" },
              { from: "1a", to: "2" },
              { from: "1a", to: "2a" },
              { from: "2a", to: "2b" },
              { from: "2", to: "3" },
              { from: "2b", to: "3" }
            ],
            groups: [{ key: "1", title: "Step 3: Use SAP HANA Cloud" },] // Initialize groups array
          });
          this.getView().setModel(oModel, "processflow");

          this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").setCurrentZoomLevel(0.6);
        }


      },

      onKGSemantics2Sparql: async function (evt) {
        this.setAppBusy(true);

        var oModel = new JSONModel({
          results: [],
          columns: [],
          sparqlQuery: "",
          ontology: "http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology",
          dataSource: "http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-rdf3"
        });
        this.getView().setModel(oModel, "kgSparqlTable");

        var that = this;
        var sTranslateSqlUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/translate_nl_to_new";
        var sUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/execute_query_raw?query_type=sql";

        const rawnlValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlKGSemanticsInput").getValue();
        const searchValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").getValue();

        console.log(searchValue);
        const nlValue = rawnlValue.replace(/\r\n|\r|\n/g, '');
        console.log(nlValue);

        // this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInput").setValue(nlValue);
        this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").setText(nlValue);

        var oPayload = {
          nl_query: nlValue
        };

        console.log(oPayload)

        $.ajax({
          url: sTranslateSqlUrl,
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(oPayload),
          success: function (oTranslateData) {
            if (oTranslateData && oTranslateData.final_query) {
              var sSqlQuery = oTranslateData.final_query;
              var sRawSqlQuery = oTranslateData.final_query;

              // Split the query into lines
              var aLines = sRawSqlQuery.split('\n');

              // Trim whitespace from each line and filter out empty lines
              var aFormattedLines = aLines.map(function (line) {
                return line.trim();
              }).filter(function (line) {
                return line !== '';
              });

              // Join the formatted lines back into a single string
              var sFormattedSqlQuery = aFormattedLines.join('\n');
              console.log("SQL Query:", sFormattedSqlQuery);

              // Update model with processed query
              oModel.setProperty("/sparqlQuery", sFormattedSqlQuery);

              that.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").setValue(sFormattedSqlQuery);

              const networkGraphModel = generateNetworkGraphModel(sFormattedSqlQuery, completeOntologyTTL);
              that.getView().setModel(networkGraphModel, "kgresults");

              var oPanel = that.byId("FPage7EnhancedAdvisoryBuddy--expandablePanel");
              oPanel.setExpanded(false);

              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("1").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("1a").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2a").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2b").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Success");

              $.ajax({
                url: sUrl,
                type: "POST",
                contentType: "text/plain", // Set content type to text/plain for the SQL query
                data: sFormattedSqlQuery,             // Send the SQL query as plain text
                success: function (oData) {
                  that.processNewResponse(oData);

                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--infoExperimental").close();
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--outputIconTabBar").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--expandablePanel").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--refreshSparqlQueryOnly").setEnabled(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--graphViewKGResults").setNoData(false);

                  that.setAppBusy(false);
                },
                error: function (oError) {
                  that.setAppBusy(false);
                  MessageToast.show("Error loading data: " + oError.statusText);
                  console.error("Error loading data:", oError);
                }
              });

              // that.handleExecuteSqlQuery(sSqlQuery); // Call the function to execute the retrieved SQL query
            } else if (oTranslateData && oTranslateData.error) {
              MessageToast.show("Error in SQL translation: " + oTranslateData.error);
              console.error("Error in SQL translation:", oTranslateData.error);
            } else {
              MessageToast.show("Invalid response format from SQL translation service.");
              console.error("Invalid response format from SQL translation service:", oTranslateData);
            }
          },
          error: function (oError) {
            that.setAppBusy(false);
            // MessageToast.show("Error translating NL to SQL: " + oError.statusText);
            // console.error("Error translating NL to SQL:", oError);
            // console.error("Error loading data:", oError.responseJSON);
            // console.error("Error loading data:", oError.responseJSON.final_query);
            if (oError.responseJSON && oError.responseJSON.final_query) {
              var sRawSqlQuery = oError.responseJSON.final_query;

              // Split the query into lines
              var aLines = sRawSqlQuery.split('\n');

              // Trim whitespace from each line and filter out empty lines
              var aFormattedLines = aLines.map(function (line) {
                return line.trim();
              }).filter(function (line) {
                return line !== '';
              });

              // Join the formatted lines back into a single string
              var sFormattedSqlQuery = aFormattedLines.join('\n');

              // console.log("Formatted SQL Query:", sFormattedSqlQuery);
              // console.log("SQL Query:", sSqlQuery);

              // Update model with processed query
              oModel.setProperty("/sparqlQuery", sFormattedSqlQuery);

              that.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").setValue(sFormattedSqlQuery);

              const networkGraphModel = generateNetworkGraphModel(sFormattedSqlQuery, completeOntologyTTL);
              that.getView().setModel(networkGraphModel, "kgresults");

              var oPanel = that.byId("FPage7EnhancedAdvisoryBuddy--expandablePanel");
              oPanel.setExpanded(false);

              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("1").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("1a").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2a").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2b").setStatus("Success");
              that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Success");

              $.ajax({
                url: sUrl,
                type: "POST",
                contentType: "text/plain", // Set content type to text/plain for the SQL query
                data: sFormattedSqlQuery,             // Send the SQL query as plain text
                success: function (oData) {
                  that.processNewResponse(oData);

                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--outputIconTabBar").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--expandablePanel").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setVisible(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--refreshSparqlQueryOnly").setEnabled(true);
                  that.getView().byId("FPage7EnhancedAdvisoryBuddy--graphViewKGResults").setNoData(false);

                  that.setAppBusy(false);
                },
                error: function (oError) {
                  that.setAppBusy(false);
                  MessageToast.show("Error loading data: " + oError.statusText);
                  console.error("Error loading data:", oError);
                  console.error("Error loading data:", oError.responseJSON);
                  console.error("Error loading data:", oError.responseJSON.final_query);
                }
              });

            }
          }
        });



      },

      processNewResponse: function (oResponse) {
        if (!oResponse || !Array.isArray(oResponse)) {
          MessageToast.show("Invalid JSON response format for SQL query");
          return;
        }

        // Get column names from the keys of the first object (if it exists)
        var aColumns = [];
        if (oResponse.length > 0) {
          aColumns = Object.keys(oResponse[0]);
        }

        // Create formatted data for the table
        var aResults = this.formatNewResponseData(oResponse);

        // Update model
        var oModel = this.getView().getModel("kgSparqlTable");
        oModel.setProperty("/columns", aColumns);
        oModel.setProperty("/results", aResults);

        // Dynamically create table columns and cells
        this.createDynamicTable(aColumns);
      },

      formatNewResponseData: function (oResponse) {
        var aFormattedData = [];

        if (Array.isArray(oResponse)) {
          aFormattedData = oResponse.map(function (oItem) {
            var oRow = {};
            for (var key in oItem) {
              if (oItem.hasOwnProperty(key)) {
                oRow[key] = {
                  value: oItem[key],
                  type: typeof oItem[key] // You can refine the type detection if needed
                };
              }
            }
            return oRow;
          });
        }

        return aFormattedData;
      },

      onKGNaturalLanguage2Sparql: async function (evt) {
        this.setAppBusy(true);

        var oModel = new JSONModel({
          results: [],
          columns: [],
          sparqlQuery: "",
          ontology: "http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology",
          dataSource: "http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-rdf3"
        });
        this.getView().setModel(oModel, "kgSparqlTable");

        // const rawnlValue = evt.getParameter("value");
        const rawnlValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInput").getValue();
        const searchValue = this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").getValue();

        // console.log(searchValue);
        const nlValue = rawnlValue.replace(/\r\n|\r|\n/g, '');
        // console.log(nlValue);

        // this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInput").setValue(nlValue);
        this.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").setText(nlValue);
        // this.getView().byId("FPage7EnhancedAdvisoryBuddy--titleForGeneratedSparqlQuery").setText("" + nlValue);


        // var self = this;
        // /** [TO IMPROVE: if change of fragment ID can lead to problems] */
        // // self.getView().byId("FPage2AdvisoryBuddy--gridList").setHeaderText("Top 5 Similar Requests: " + cleanValue);

        // /** Improvements: for reusability of fragment */
        // var oGridList1 = this.getView().byId(this.createId("FPage7EnhancedAdvisoryBuddy--gridListEnhancedAdvisoryBuddy"));
        // oGridList1.setHeaderText("Top 5 Similar Requests: " + cleanValue);

        // const myHeaders = new Headers();
        // myHeaders.append("Content-Type", "application/json");

        // const options = {
        //   headers: myHeaders,
        //   method: 'POST',
        //   body: '{"schema_name": "' + HANA_EMB_SEARCH_SCHEMANAME + '", "table_name": "' + HANA_EMB_SEARCH_TABLENAME + '","query_text":"' + cleanValue + '"}'
        // };

        // try {
        //   const response = await fetch(HANA_EMB_SEARCH_EP, options);
        //   const data = await response.json();
        //   this.addResultsToSearchResultsControl(data);
        // } catch (error) {
        //   console.error("In onKGNaturalLanguage2Sparql:");
        //   console.error(error);
        // }

        var that = this;
        var sUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/execute_query_raw";

        var sTranslateUrl = "https://kgwebinar.cfapps.eu12.hana.ondemand.com/translate_nl_to_sparql";
        var oModel = this.getView().getModel("kgSparqlTable");

        var oPayload = {
          nl_query: rawnlValue,
          ontology: oModel.getProperty("/ontology")
        };
        // this.getView().setModel(oModel, "kgSparqlTable");

        // Make POST request for translation
        $.ajax({
          url: sTranslateUrl,
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(oPayload),
          success: function (oSQData) {
            // Process the SPARQL query from response
            var sProcessedQuery = that.processSparqlResponse(oSQData, oModel.getProperty("/ontology"), oModel.getProperty("/dataSource"));
            console.log(sProcessedQuery);
            localStorage.setItem('ontology-sparql', sProcessedQuery);
            that.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQuery").setValue(sProcessedQuery);

            // Update model with processed query
            oModel.setProperty("/sparqlQuery", sProcessedQuery);

            const networkGraphModel = generateNetworkGraphModelFromSparql(sProcessedQuery, completeOntologyTTL);
            that.getView().setModel(networkGraphModel, "kgresults");

            // MessageToast.show("Query translated successfully");
            // Make POST request with text payload
            $.ajax({
              url: sUrl,
              type: "POST",
              contentType: "text/plain",  // Set content type to text/plain for the SPARQL query
              data: sProcessedQuery,               // Send the query as plain text
              success: function (oData) {
                // Method 1: Format data and fit into defined table
                // var aFormattedData = that.formatResponseData(oData);
                // var oTable = new JSONModel(aFormattedData);
                // that.getView().setModel(oTable, "kgSparqlTable");
                // MessageToast.show("Data loaded successfully");

                // Method 2: Dynamic response to Dynamic Table (Moved outside)
                // var oModel = new JSONModel({
                //   results: [],
                //   columns: []
                // });
                console.log(oData);

                that.processResponse(oData);

                that.getView().byId("FPage7EnhancedAdvisoryBuddy--infoExperimental").close();
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--outputIconTabBar").setVisible(true);
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--nlInputHeader").setVisible(true);
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--expandablePanel").setVisible(true);
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable").setVisible(true);
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--graphViewKGResults").setNoData(false)

                that.setAppBusy(false);

                that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("1").setStatus("Success");
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("1a").setStatus("Success");
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("2").setStatus("Success");
                that.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getNodeByKey("3").setStatus("Success");

                var oPanel = that.byId("FPage7EnhancedAdvisoryBuddy--expandablePanel");
                oPanel.setExpanded(false);
              },
              error: function (oError) {
                that.setAppBusy(false);
                MessageToast.show("Error loading data: " + oError.statusText);
                console.error("Error loading data:", oError);
              }
            });
          },
          error: function (oError) {
            that.setAppBusy(false);
            MessageToast.show("Error translating query: " + oError.statusText);
            console.error("Error translating query:", oError);
          }
        });
      },

      processSparqlResponse: function (oResponse, sOntology, sDataSource) {
        if (!oResponse || !oResponse.sparql_query) {
          return "";
        }

        var sSparqlQuery = oResponse.sparql_query;
        var originalText = sSparqlQuery;
        // console.log("starting processSparqlResponse");
        // console.log(sSparqlQuery);

        // // Step 1: Remove markdown code block markers and extra newlines
        // sSparqlQuery = sSparqlQuery.replace(/```sparql\n/g, "")
        //   .replace(/```/g, "")
        //   .replace(/\\n/g, "\n")
        //   .replace(/\n\n+/g, "\n");

        // // First, normalize the text for easier processing
        // var normalizedText = originalText.replace(/```sparql\n/g, "")
        // .replace(/```/g, "")
        // .replace(/\\n/g, "\n");

        // // Remove the exact clean query from the normalized text
        // var explanationText = "";
        // var queryIndex = normalizedText.indexOf(sSparqlQuery);

        // if (queryIndex > 0) {
        //     // There's text before the query
        //     explanationText = normalizedText.substring(0, queryIndex).trim();
        // } else if (queryIndex === -1) {
        //     // The exact query wasn't found, so try to identify explanatory paragraphs
        //     // Look for text that doesn't look like SPARQL syntax
        //     var lines = normalizedText.split("\n");
        //     var explanationLines = [];

        //     for (var i = 0; i < lines.length; i++) {
        //         var line = lines[i].trim();

        //         // Skip empty lines
        //         if (line === "") continue;

        //         // Refined Regex to identify SPARQL syntax lines.
        //         // Check for triple patterns (subject predicate object), keywords, brackets, and variables.
        //         if (line.match(/^(PREFIX|SELECT|WHERE|FILTER|LIMIT|ORDER BY|GROUP BY|HAVING|OPTIONAL|UNION|GRAPH|BIND)/i) ||
        //         line.match(/^[{}]/) ||
        //         line.match(/^\?[a-zA-Z]/) ||
        //         line.match(/^([<a-zA-Z0-9_:\/?#.-]+|\?[a-zA-Z0-9_]+)\s+([<a-zA-Z0-9_:\/?#.-]+|\?[a-zA-Z0-9_]+)\s+([<a-zA-Z0-9_:\/?#.-]+|\?[a-zA-Z0-9_]+)\s*[.;]?$/)
        //         ) {
        //             continue;
        //         }

        //         // This line is likely explanatory text
        //         explanationLines.push(line);
        //         // Remove the line from cleanQuery:
        //         // 1. escape the line to use in regex
        //         var escapedLine = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        //         // 2. create the regex to match the line, with optional leading/trailing spaces and newlines
        //         var regex = new RegExp("\\s*" + escapedLine + "\\s*\\n?", "g");
        //         // 3. remove the line from cleanQuery
        //         sSparqlQuery = sSparqlQuery.replace(regex, "");
        //     }

        //     explanationText = explanationLines.join("\n");
        //     // this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQueryExplanation").setVisible(true);
        //     // this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQueryExplanation").setText(explanationText + "<br><em>-- The above explanatory text is generated by Generative AI.</em>");
        // }

        // // Clean up the explanation text
        // explanationText = explanationText.replace(/\n{3,}/g, "\n\n")  // Replace excessive newlines
        //     .trim();

        // console.log("explanationText");
        // console.log(explanationText);



        // // Step 2: Replace example.org prefix with the actual ontology URI
        // sSparqlQuery = sSparqlQuery.replace(/<http:\/\/example\.org\/ontology#>/g,
        //   "<" + sOntology + "/>");

        // // Step 3: Fix escaped quotes in the query
        // sSparqlQuery = sSparqlQuery.replace(/\\"/g, '"');

        // // Replace example.org namespace with your ontology namespace
        // sSparqlQuery = sSparqlQuery.replace(/<http:\/\/example\.org\/>/g,
        //   "<" + sOntology + "/>");

        // // Step 4: Add standard prefixes if they don't exist
        // if (!sSparqlQuery.includes("prefix rdf:")) {
        //   sSparqlQuery = "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + sSparqlQuery;
        // }
        // if (!sSparqlQuery.includes("prefix rdfs:")) {
        //   sSparqlQuery = "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + sSparqlQuery;
        // }
        // if (!sSparqlQuery.includes("prefix owl:")) {
        //   sSparqlQuery = "prefix owl: <http://www.w3.org/2002/07/owl#>\n" + sSparqlQuery;
        // }

        // sSparqlQuery = "prefix : <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology/>\n" + sSparqlQuery;

        // // Step 5: Add FROM clause if missing
        // if (sDataSource && !sSparqlQuery.includes("FROM")) {
        //   var selectPos = sSparqlQuery.indexOf("SELECT");
        //   var wherePos = sSparqlQuery.indexOf("WHERE");

        //   if (selectPos !== -1 && wherePos !== -1) {
        //     var insertPos = sSparqlQuery.indexOf("\n", selectPos) + 1;
        //     var fromClause = "    FROM <" + sDataSource + ">\n";
        //     sSparqlQuery = sSparqlQuery.slice(0, insertPos) + fromClause + sSparqlQuery.slice(insertPos);
        //   }
        // }

        // // Step 6: Add LIMIT if not present
        // if (!sSparqlQuery.includes("LIMIT")) {
        //   sSparqlQuery += "\nLIMIT 100";
        // }

        // Step 8: Remove trailing dot after WHERE clause
        // sSparqlQuery = sSparqlQuery.replace(/WHERE\s*\{[\s\S]*?\}\s*\.$/i, "WHERE {\n$1\n}");
        // sSparqlQuery = sSparqlQuery.replace(/WHERE\s*\{\s*[\s\S]*?\}\.$/i, "WHERE {$1}");

        sSparqlQuery = sSparqlQuery.trimEnd().replace(/\.$/, '');


        console.log("after cleaned");
        console.log(sSparqlQuery);

        return sSparqlQuery;
      },

      //  old code prior new nl to sparql
      // processSparqlResponse: function (oResponse, sOntology, sDataSource) {
      //   if (!oResponse || !oResponse.sparql_query) {
      //     return "";
      //   }

      //   var sSparqlQuery = oResponse.sparql_query;
      //   var originalText = sSparqlQuery;
      //   console.log("starting processSparqlResponse");
      //   console.log(sSparqlQuery);

      //   // Step 1: Remove markdown code block markers and extra newlines
      //   sSparqlQuery = sSparqlQuery.replace(/```sparql\n/g, "")
      //     .replace(/```/g, "")
      //     .replace(/\\n/g, "\n")
      //     .replace(/\n\n+/g, "\n");

      //   // First, normalize the text for easier processing
      //   var normalizedText = originalText.replace(/```sparql\n/g, "")
      //   .replace(/```/g, "")
      //   .replace(/\\n/g, "\n");

      //   // Remove the exact clean query from the normalized text
      //   var explanationText = "";
      //   var queryIndex = normalizedText.indexOf(sSparqlQuery);

      //   if (queryIndex > 0) {
      //       // There's text before the query
      //       explanationText = normalizedText.substring(0, queryIndex).trim();
      //   } else if (queryIndex === -1) {
      //       // The exact query wasn't found, so try to identify explanatory paragraphs
      //       // Look for text that doesn't look like SPARQL syntax
      //       var lines = normalizedText.split("\n");
      //       var explanationLines = [];

      //       for (var i = 0; i < lines.length; i++) {
      //           var line = lines[i].trim();

      //           // Skip empty lines
      //           if (line === "") continue;

      //           // Refined Regex to identify SPARQL syntax lines.
      //           // Check for triple patterns (subject predicate object), keywords, brackets, and variables.
      //           if (line.match(/^(PREFIX|SELECT|WHERE|FILTER|LIMIT|ORDER BY|GROUP BY|HAVING|OPTIONAL|UNION|GRAPH|BIND)/i) ||
      //           line.match(/^[{}]/) ||
      //           line.match(/^\?[a-zA-Z]/) ||
      //           line.match(/^([<a-zA-Z0-9_:\/?#.-]+|\?[a-zA-Z0-9_]+)\s+([<a-zA-Z0-9_:\/?#.-]+|\?[a-zA-Z0-9_]+)\s+([<a-zA-Z0-9_:\/?#.-]+|\?[a-zA-Z0-9_]+)\s*[.;]?$/)
      //           ) {
      //               continue;
      //           }

      //           // This line is likely explanatory text
      //           explanationLines.push(line);
      //           // Remove the line from cleanQuery:
      //           // 1. escape the line to use in regex
      //           var escapedLine = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      //           // 2. create the regex to match the line, with optional leading/trailing spaces and newlines
      //           var regex = new RegExp("\\s*" + escapedLine + "\\s*\\n?", "g");
      //           // 3. remove the line from cleanQuery
      //           sSparqlQuery = sSparqlQuery.replace(regex, "");
      //       }

      //       explanationText = explanationLines.join("\n");
      //       this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQueryExplanation").setVisible(true);
      //       this.getView().byId("FPage7EnhancedAdvisoryBuddy--generatedSparqlQueryExplanation").setText(explanationText + "<br><em>-- The above explanatory text is generated by Generative AI.</em>");
      //   }

      //   // Clean up the explanation text
      //   explanationText = explanationText.replace(/\n{3,}/g, "\n\n")  // Replace excessive newlines
      //       .trim();

      //   console.log("explanationText");
      //   console.log(explanationText);



      //   // Step 2: Replace example.org prefix with the actual ontology URI
      //   sSparqlQuery = sSparqlQuery.replace(/<http:\/\/example\.org\/ontology#>/g,
      //     "<" + sOntology + "/>");

      //   // Step 3: Fix escaped quotes in the query
      //   sSparqlQuery = sSparqlQuery.replace(/\\"/g, '"');

      //   // Replace example.org namespace with your ontology namespace
      //   sSparqlQuery = sSparqlQuery.replace(/<http:\/\/example\.org\/>/g,
      //     "<" + sOntology + "/>");

      //   // Step 4: Add standard prefixes if they don't exist
      //   if (!sSparqlQuery.includes("prefix rdf:")) {
      //     sSparqlQuery = "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + sSparqlQuery;
      //   }
      //   if (!sSparqlQuery.includes("prefix rdfs:")) {
      //     sSparqlQuery = "prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + sSparqlQuery;
      //   }
      //   if (!sSparqlQuery.includes("prefix owl:")) {
      //     sSparqlQuery = "prefix owl: <http://www.w3.org/2002/07/owl#>\n" + sSparqlQuery;
      //   }

      //   sSparqlQuery = "prefix : <http://www.semanticweb.org/ontologies/2025/smart-technical-advisory-ontology/>\n" + sSparqlQuery;

      //   // Step 5: Add FROM clause if missing
      //   if (sDataSource && !sSparqlQuery.includes("FROM")) {
      //     var selectPos = sSparqlQuery.indexOf("SELECT");
      //     var wherePos = sSparqlQuery.indexOf("WHERE");

      //     if (selectPos !== -1 && wherePos !== -1) {
      //       var insertPos = sSparqlQuery.indexOf("\n", selectPos) + 1;
      //       var fromClause = "    FROM <" + sDataSource + ">\n";
      //       sSparqlQuery = sSparqlQuery.slice(0, insertPos) + fromClause + sSparqlQuery.slice(insertPos);
      //     }
      //   }

      //   // Step 6: Add LIMIT if not present
      //   if (!sSparqlQuery.includes("LIMIT")) {
      //     sSparqlQuery += "\nLIMIT 100";
      //   }

      //   return sSparqlQuery;
      // },

      processResponse: function (oResponse) {
        if (!oResponse || !oResponse.head || !oResponse.head.vars || !oResponse.results || !oResponse.results.bindings) {
          MessageToast.show("Invalid response format");
          return;
        }

        // Get column names from the response
        var aColumns = oResponse.head.vars;
        console.log(aColumns);

        // Create formatted data for the table
        var aResults = this.formatResponseData(oResponse);


        // Update model
        var oModel = this.getView().getModel("kgSparqlTable");
        oModel.setProperty("/columns", aColumns);
        oModel.setProperty("/results", aResults);

        // Dynamically create table columns and cells
        this.createDynamicTable(aColumns);
      },

      formatResponseData: function (oResponse) {
        var aFormattedData = [];
        var aColumns = oResponse.head.vars;

        if (oResponse.results && oResponse.results.bindings) {
          aFormattedData = oResponse.results.bindings.map(function (oItem) {
            var oRow = {};

            // Process each column in the response
            aColumns.forEach(function (sColumn) {
              if (oItem[sColumn]) {
                oRow[sColumn] = {
                  value: oItem[sColumn].value,
                  type: oItem[sColumn].type
                };
              } else {
                oRow[sColumn] = {
                  value: "",
                  type: "unknown"
                };
              }
            });

            return oRow;
          });
        }

        return aFormattedData;
      },

      createDynamicTable: function (aColumns) {
        var that = this;
        var oTable = this.getView().byId("FPage7EnhancedAdvisoryBuddy--resultsTable");

        // Clear existing columns and template cells
        oTable.removeAllColumns();
        var oTemplate = oTable.getBindingInfo("items").template;
        oTemplate.removeAllCells();

        // Add new columns and template cells based on the response
        // aColumns.forEach(function (sColumn) {
        //     // Add column to the table
        //     oTable.addColumn(new Column({
        //         header: new Text({ text: this.formatColumnHeader(sColumn) })
        //     }));

        //     // Add cell to the template
        //     var sBindingPath = "{kgSparqlTable>" + sColumn + "/value}";
        //     console.log("bindingp ath of cell column");
        //     console.log(sBindingPath);
        //     oTemplate.addCell(new Text({ text: sBindingPath }));
        // }, this);

        aColumns.forEach(function (sColumn) {
          // Add column to the table
          oTable.addColumn(new Column({
            header: new Text({ text: this.formatColumnHeader(sColumn) })
          }));

          // Add cell to the template with appropriate formatter
          var oText = new Text();

          // Apply specific formatters based on column name and value type
          if (sColumn === "partner") {
            // For partner column (typically contains URIs with partner IDs)
            oText.bindProperty("text", {
              path: "kgSparqlTable>" + sColumn + "/value",
              formatter: that.formatPartnerId.bind(that)
            });
          } else if (sColumn === "country") {
            // For country column (typically contains URIs with country codes)
            oText.bindProperty("text", {
              path: "kgSparqlTable>" + sColumn + "/value",
              formatter: that.formatCountry.bind(that)
            });
          } else {
            // For other columns, apply generic formatting based on type
            oText.bindProperty("text", {
              path: "kgSparqlTable>" + sColumn,
              formatter: that.formatValue.bind(that)
            });
          }

          oTemplate.addCell(oText);
        }, this);

        // Re-apply the binding with the new template
        oTable.bindItems({
          path: "kgSparqlTable>/results",
          template: oTemplate
        });
      },
      processResponseForSparqlExplorer: function (oResponse) {
        if (!oResponse || !oResponse.head || !oResponse.head.vars || !oResponse.results || !oResponse.results.bindings) {
          MessageToast.show("Invalid response format");
          return;
        }

        // Get column names from the response
        var aColumns = oResponse.head.vars;
        console.log(aColumns);

        // Create formatted data for the table
        var aResults = this.formatResponseDataForSparqlExplorer(oResponse);


        // Update model
        var oModel = this.getView().getModel("kgSparqlExplorerTable");
        oModel.setProperty("/columns", aColumns);
        oModel.setProperty("/results", aResults);

        // Dynamically create table columns and cells
        this.createDynamicTableForSparqlExplorer(aColumns);
      },

      formatResponseDataForSparqlExplorer: function (oResponse) {
        var aFormattedData = [];
        var aColumns = oResponse.head.vars;

        if (oResponse.results && oResponse.results.bindings) {
          aFormattedData = oResponse.results.bindings.map(function (oItem) {
            var oRow = {};

            // Process each column in the response
            aColumns.forEach(function (sColumn) {
              if (oItem[sColumn]) {
                oRow[sColumn] = {
                  value: oItem[sColumn].value,
                  type: oItem[sColumn].type
                };
              } else {
                oRow[sColumn] = {
                  value: "",
                  type: "unknown"
                };
              }
            });

            return oRow;
          });
        }

        return aFormattedData;
      },

      createDynamicTableForSparqlExplorer: function (aColumns) {
        var that = this;
        var oTable = this.getView().byId("FPage8SparqlExplorer--sparqlExplorerResultsTable");

        // Clear existing columns and template cells
        oTable.removeAllColumns();
        var oTemplate = oTable.getBindingInfo("items").template;
        oTemplate.removeAllCells();

        // Add new columns and template cells based on the response
        // aColumns.forEach(function (sColumn) {
        //     // Add column to the table
        //     oTable.addColumn(new Column({
        //         header: new Text({ text: this.formatColumnHeader(sColumn) })
        //     }));

        //     // Add cell to the template
        //     var sBindingPath = "{kgSparqlTable>" + sColumn + "/value}";
        //     console.log("bindingp ath of cell column");
        //     console.log(sBindingPath);
        //     oTemplate.addCell(new Text({ text: sBindingPath }));
        // }, this);

        aColumns.forEach(function (sColumn) {
          // Add column to the table
          oTable.addColumn(new Column({
            header: new Text({ text: this.formatColumnHeader(sColumn) })
          }));

          // Add cell to the template with appropriate formatter
          var oText = new Text();

          // Apply specific formatters based on column name and value type
          if (sColumn === "partner") {
            // For partner column (typically contains URIs with partner IDs)
            oText.bindProperty("text", {
              path: "kgSparqlExplorerTable>" + sColumn + "/value",
              formatter: that.formatPartnerId.bind(that)
            });
          } else if (sColumn === "country") {
            // For country column (typically contains URIs with country codes)
            oText.bindProperty("text", {
              path: "kgSparqlExplorerTable>" + sColumn + "/value",
              formatter: that.formatCountry.bind(that)
            });
          } else {
            // For other columns, apply generic formatting based on type
            oText.bindProperty("text", {
              path: "kgSparqlExplorerTable>" + sColumn,
              formatter: that.formatValue.bind(that)
            });
          }

          oTemplate.addCell(oText);
        }, this);

        // Re-apply the binding with the new template
        oTable.bindItems({
          path: "kgSparqlExplorerTable>/results",
          template: oTemplate
        });
      },

      formatColumnHeader: function (sColumn) {
        // Make the column header more readable
        return sColumn.charAt(0).toUpperCase() + sColumn.slice(1);
      },

      formatValue: function (oValue) {
        if (!oValue) return "";

        // Format based on the type
        if (oValue.type === "uri") {
          // For URIs, extract the last part
          var aUriParts = oValue.value.split("/");
          var sLastPart = aUriParts[aUriParts.length - 1];

          return sLastPart;
        }

        return oValue.value;
      },

      formatPartnerId: function (sPartnerUri) {
        if (!sPartnerUri) {
          return "";
        }

        // Extract the ID from the end of the URI
        var aUriParts = sPartnerUri.split("/");
        var sLastPart = aUriParts[aUriParts.length - 1];

        // Extract just the numeric part
        return sLastPart.replace("Partner", "");
      },

      formatCountry: function (sCountryUri) {
        if (!sCountryUri) {
          return "";
        }

        // Extract the country code from the end of the URI
        var aUriParts = sCountryUri.split("/");
        var sLastPart = aUriParts[aUriParts.length - 1];

        // Extract just the country code
        var sCountryCode = sLastPart.replace("Country", "");

        // Map country codes to full names
        var oCountryMap = {
          "GE": "Germany",
          "US": "United States",
          "UK": "United Kingdom",
          "FR": "France",
          // Add more countries as needed
        };

        return oCountryMap[sCountryCode] || sCountryCode;
      },

      onEmbedHANASimilaritySearch: async function (evt) {
        this.setAppBusy(true);

        const searchValue = evt.getParameter("value");
        const cleanValue = searchValue.replace(/\r\n|\r|\n/g, '');

        var self = this;
        /** [TO IMPROVE: if change of fragment ID can lead to problems] */
        // self.getView().byId("FPage2AdvisoryBuddy--gridList").setHeaderText("Top 5 Similar Requests: " + cleanValue);

        /** Improvements: for reusability of fragment */
        var oGridList1 = this.getView().byId(this.createId("FPage2AdvisoryBuddy--gridList"));
        oGridList1.setHeaderText("Top 5 Similar Requests: " + cleanValue);

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const options = {
          headers: myHeaders,
          method: 'POST',
          body: '{"schema_name": "' + HANA_EMB_SEARCH_SCHEMANAME + '", "table_name": "' + HANA_EMB_SEARCH_TABLENAME + '","query_text":"' + cleanValue + '"}'
        };

        try {
          const response = await fetch(HANA_EMB_SEARCH_EP, options);
          const data = await response.json();
          this.addResultsToSearchResultsControl(data);
        } catch (error) {
          console.error("In onEmbedHANASimilaritySearch:");
          console.error(error);
        }

        this.setAppBusy(false);
      },
      onCoinStar: function (oEvent) {
        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        // console.log(gridlistitemcontextdata);
        MessageToast.show("Opening Coinstar of Project #" + gridlistitemcontextdata.project_number);
        window.open(COINSTAR_URL, "_blank");
      },
      onAddFav: function (oEvent) {
        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        // console.log(gridlistitemcontextdata);
        MessageToast.show("Added to favourites of Project #" + gridlistitemcontextdata.project_number);
      },
      onCopy: function (oEvent) {
        var oModel = this.getView().getModel("search");
        var gridlistitemcontextdata = oModel.getProperty(oEvent.getSource().getParent().oPropagatedProperties.oBindingContexts.search.sPath);
        console.log(gridlistitemcontextdata);
        MessageToast.show("Text copied successfully to clipboard.");
        copyToClipboard(gridlistitemcontextdata.TEXT);
      },
      onCall: function (oEvent) {
        MessageToast.show("Opening MS Teams");
        openMSTeams(MSTEAMS_URL);
      },

      openQuickView: function (oEvent, oModel) {
        var oButton = oEvent.getSource(),
          oView = this.getView();

        var oModel = this.getView().getModel("pages");

        if (!this._pQuickView) {
          this._pQuickView = Fragment.load({
            id: oView.getId(),
            name: "chat.view.TAQuickView",
            controller: this
          }).then(function (oQuickView) {
            oView.addDependent(oQuickView);
            return oQuickView;
          });
        }
        this._pQuickView.then(function (oQuickView) {
          oQuickView.setModel(oModel);
          oQuickView.openBy(oButton);
        });
      },

      /** [START] Functions for: Learning Plan Drag Drop */
      addResultsToSearchResultsControl: function (content) {
        var oModel = new JSONModel(JSON.parse(JSON.stringify(content)));
        this.getView().setModel(oModel, "search");
      },

      initMockDataForLearningPlanAssignmentDragDrop: function () {
        this.byId("list1").setModel(new JSONModel([
          { title: "Multitenancy", rows: 1, columns: 1 },
          { title: "Business AI", rows: 1, columns: 1 },
          { title: "Integration Suite", rows: 1, columns: 1 }
        ]), "grid");

        this.byId("grid1").setModel(new JSONModel([
          { title: "CAP", rows: 1, columns: 1 },
          { title: "SAPUI5", rows: 1, columns: 1 },
          { title: "Java", rows: 1, columns: 1 }
        ]), "grid");
      },

      attachDragAndDrop: function () {
        var oList = this.byId("list1");
        oList.addDragDropConfig(new DragInfo({
          sourceAggregation: "items"
        }));

        oList.addDragDropConfig(new DropInfo({
          targetAggregation: "items",
          dropPosition: DropPosition.Between,
          dropLayout: DropLayout.Vertical,
          drop: this.onDrop.bind(this)
        }));

        var oGrid = this.byId("grid1");
        oGrid.addDragDropConfig(new DragInfo({
          sourceAggregation: "items"
        }));

        oGrid.addDragDropConfig(new GridDropInfo({
          targetAggregation: "items",
          dropPosition: DropPosition.Between,
          dropLayout: DropLayout.Horizontal,
          dropIndicatorSize: this.onDropIndicatorSize.bind(this),
          drop: this.onDrop.bind(this)
        }));
      },

      onDropIndicatorSize: function (oDraggedControl) {
        var oBindingContext = oDraggedControl.getBindingContext(),
          oData = oBindingContext.getModel("grid").getProperty(oBindingContext.getPath());

        if (oDraggedControl.isA("sap.m.StandardListItem")) {
          return {
            rows: oData.rows,
            columns: oData.columns
          };
        }
      },

      onDrop: function (oInfo) {
        var oDragged = oInfo.getParameter("draggedControl"),
          oDropped = oInfo.getParameter("droppedControl"),
          sInsertPosition = oInfo.getParameter("dropPosition"),

          oDragContainer = oDragged.getParent(),
          oDropContainer = oInfo.getSource().getParent(),

          oDragModel = oDragContainer.getModel("grid"),
          oDropModel = oDropContainer.getModel("grid"),
          oDragModelData = oDragModel.getData(),
          oDropModelData = oDropModel.getData(),

          iDragPosition = oDragContainer.indexOfItem(oDragged),
          iDropPosition = oDropContainer.indexOfItem(oDropped);

        // remove the item
        var oItem = oDragModelData[iDragPosition];
        oDragModelData.splice(iDragPosition, 1);

        if (oDragModel === oDropModel && iDragPosition < iDropPosition) {
          iDropPosition--;
        }

        if (sInsertPosition === "After") {
          iDropPosition++;
        }

        // insert the control in target aggregation
        oDropModelData.splice(iDropPosition, 0, oItem);

        if (oDragModel !== oDropModel) {
          oDragModel.setData(oDragModelData);
          oDropModel.setData(oDropModelData);
        } else {
          oDropModel.setData(oDropModelData);
        }

        this.byId("grid1").focusItem(iDropPosition);
      },
      /** [END] Functions for: Learning Plan Drag Drop */

      onKBListItemPress: function (oEvent) {
        const oListItem = oEvent.getSource(),
          oView = this.getView();

        //Get the ObjectAttribute control using the idForLabel
        const oObjectAttribute = oListItem.getAggregation("attributes")[0];

        const oText = oObjectAttribute.getAggregation("_textControl");
        oText.getDomRef().classList.remove("sapMTextNoWrap");

        /**
         * [TODO]
         * Popover
         */
        // create popover

        // var oModel = this.getView().getModel("projects");

        // if (!this._pPopover) {
        //   this._pPopover = Fragment.load({
        //     id: oView.getId(),
        //     name: "chat.view.ProjectPopover",
        //     controller: this
        //   }).then(function(oPopover) {
        //     oView.addDependent(oPopover);
        //     oPopover.bindElement(oListItem.oBindingContexts.projects.sPath);
        //     return oPopover;
        //   });
        // }
        // this._pPopover.then(function(oPopover) {
        //   oPopover.setModel(oModel);
        //   oPopover.openBy(oListItem);
        // });
      },

      onKBSearch: function (oEvent) {
        // add filter for search
        var aFilters = [];
        var sQuery = oEvent.getSource().getValue();
        // console.log(sQuery);
        if (sQuery && sQuery.length > 0) {
          var filter = new Filter("project_number", FilterOperator.EQ, sQuery);
          // var filter = new Filter("solution", FilterOperator.Contains, sQuery);
          aFilters.push(filter);
        }

        // var oList = this.byId("idList");
        var oList = this.getView().byId(this.createId("FPage3KnowledgeBase--idList"));
        var oBinding = oList.getBinding("items");
        oBinding.filter(aFilters, "Application");
      },

      onKBSelectionChange: function (oEvent) {
        var oList = oEvent.getSource();
        var oLabel = this.byId("idFilterLabel");
        var oInfoToolbar = this.byId("idInfoToolbar");

        // With the 'getSelectedContexts' function you can access the context paths
        // of all list items that have been selected, regardless of any current
        // filter on the aggregation binding.
        var aContexts = oList.getSelectedContexts(true);

        // update UI
        var bSelected = (aContexts && aContexts.length > 0);
        var sText = (bSelected) ? aContexts.length + " selected" : null;
        oInfoToolbar.setVisible(bSelected);
        oLabel.setText(sText);
      },

      onKBProjectPress: function (oEvent) {
        var oItem = oEvent.getSource();
        var oBindingContext = oItem.getBindingContext();
        var oModel = this.getView().getModel('projects');
        var oSettingsModel = this.getView().getModel('settings');
        oSettingsModel.setProperty("/navigatedItem", oModel.getProperty("project_number", oBindingContext));

        // console.log(oItem.oBindingContexts.projects.sPath);
        var gridlistitemcontextdata = oModel.getProperty(oItem.oBindingContexts.projects.sPath);
        var projID = gridlistitemcontextdata.project_number;
        // console.log(projID);
        // MessageToast.show(projID);
      },

      isNavigated: function (sNavigatedItemId, sItemId) {
        // MessageToast.show(sItemId);
        return sNavigatedItemId === sItemId;
      },

      onColChartHandleSelectionChange: async function (oEvent) {
        this.getView().byId("FPage5CategoryMgmt--columnCard").setBusy(true);
        var oItem = oEvent.getParameter("selectedItem");
        const url = ALL_PROJECTS_BY_EXPERT_EP + '?expert=' + oItem.getKey();

        // var vizFrame = this.getView().byId(this._constants.vizFrame.id);
        var vizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--chartContainerVizFrame");

        const options = { method: 'GET' };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          var oModel = new JSONModel(data);
          vizFrame.setModel(oModel);
          //  Seems like not required for this vizUpdate() as it requires more dataset.
          //  https://sapui5.hana.ondemand.com/#/api/sap.viz.ui5.controls.VizFrame%23methods/vizUpdate
          // vizFrame.vizUpdate();
          this.getView().byId("FPage5CategoryMgmt--columnCard").setBusy(false);
        } catch (error) {
          console.error("In onColChartHandleSelectionChange:");
          console.error(error);
          this.getView().byId("FPage5CategoryMgmt--columnCard").setBusy(false);
        }
      },

      _constants: {
        sampleName: "chat",
        vizFrame: {
          id: "chartContainerVizFrame",
          dataset: {
            dimensions: [{
              name: 'Category',
              value: "{CATEGORY}"
            }],
            measures: [{
              group: 1,
              name: 'Profit',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: 'Target',
              value: '{Target}'
            }, {
              group: 1,
              name: "Forcast",
              value: "{Forcast}"
            }, {
              group: 1,
              name: "No of Projects",
              value: "{PROJECTS}"
            },
            {
              group: 1,
              name: 'Revenue2',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: "Revenue3",
              value: "{Revenue3}"
            }],
            data: {
              path: "/advisories_by_category"
            }
          },
          // modulePath: "/mockdata/ProductsByCategory.json",
          type: "column",
          properties: {
            title: {
              visible: false,
              text: "Trending Topics by Categories"
            },
            legend: {
              visible: false
            },
            plotArea: {
              showGap: true
            },
          },
          feedItems: [{
            'uid': "primaryValues",
            'type': "Measure",
            'values': ["No of Projects"]
          }, {
            'uid': "axisLabels",
            'type': "Dimension",
            'values': ["Category"]
          }, {
            'uid': "targetValues",
            'type': "Measure",
            'values': ["Target"]
          }]
        }
      },

      _pieconstants: {
        sampleName: "chat",
        vizFrame: {
          id: "piechartContainerVizFrame",
          dataset: {
            dimensions: [{
              name: 'Category',
              value: "{Category}"
            }],
            measures: [{
              group: 1,
              name: 'Profit',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: 'Target',
              value: '{Target}'
            }, {
              group: 1,
              name: "Forcast",
              value: "{Forcast}"
            }, {
              group: 1,
              name: "ProjectsCount",
              value: "{ProjectsCount}"
            },
            {
              group: 1,
              name: 'Revenue2',
              value: '{Revenue2}'
            }, {
              group: 1,
              name: "Revenue3",
              value: "{Revenue3}"
            }],
            data: {
              path: "/Categories"
            }
          },
          // modulePath: "/mockdata/ChartContainerData.json",
          type: "pie",
          properties: {
            legend: {
              visible: false
            },
            title: {
              visible: false,
              text: "Trending Topics by Categories"
            },
            plotArea: {
              showGap: true,
              dataLabel: {
                visible: true
              }
            }
          },
          feedItems: [{
            'uid': "size",
            'type': "Measure",
            'values': ["ProjectsCount"]
          }, {
            'uid': "color",
            'type': "Dimension",
            'values': ["Category"]
          }, {
            'uid': "targetValues",
            'type': "Measure",
            'values': ["Target"]
          }]
        }
      },

      onCatMgmtEdit: function () {
        // Enable edit mode
        const oModel = this.getView().getModel("categorymgmt");
        oModel.setProperty("/isEditMode", true);
      },

      onCatMgmtCancel: function () {
        // Revert to original data and disable edit mode
        const oModel = this.getView().getModel("categorymgmt");
        const originalData = oModel.getProperty("/originalData");
        oModel.setProperty("/clusters", JSON.parse(JSON.stringify(originalData))); // Restore original data
        oModel.setProperty("/isEditMode", false);
      },

      onCatMgmtSave: function () {
        // Get the updated data from the model
        this.setAppBusy(true);
        const oModel = this.getView().getModel("categorymgmt");
        const updatedData = oModel.getProperty("/clusters");
        oModel.setProperty("/isEditMode", false);

        // Transform the data into the required format
        const payload = {};
        updatedData.forEach((item) => {
          payload[item.category_label] = item.category_descr;
        });

        // console.log(payload);

        // MessageToast.show("Uh-oh, seems like there's some issue with the API call to update.");

        // Send the transformed data to the server via POST request
        fetch(UPDATE_CATEGORIES_EP, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        })
          .then((response) => {
            if (response.ok) {
              MessageToast.show("Category data has been updated successfully!");
            } else {
              throw new Error("Uh-oh, seems like there's some issue with the API call to update.");
            }
            this.setAppBusy(false);
          })
          .catch((error) => {
            console.error("Error updating category data:", error);
            MessageToast.show("Uh-oh, seems like there's some issue with the API call to update. Please try again.");
            this.setAppBusy(false);
          });
      },

      onCatMgmtAutoRefresh: async function (oEvent) {
        /** [TODO] AUTO REFRESH FEATURE
        * 3. Project Breakdown Piechart (sapui5): refresh overalls
        * 4. Project Workload Column Chart (sapui5): refresh overalls with filtered expert
        * 5. Cat Mgmt Table refresh
        */
        var oState = oEvent.getParameter("state");

        if (oState) {
          // localStorage.setItem("AUTO-REFRESH", "true");

          // Store the interval ID so you can clear it later
          if (!this._autoRefreshInterval) { // Check if it's already set
            this._autoRefreshInterval = setInterval(async () => {
              const now = new Date();
              const formattedDateTime = now.toLocaleString();

              this.getView().byId("FPage5CategoryMgmt--pieRefreshLabel").setText("Last refreshed at " + formattedDateTime);
              this.getView().byId("FPage5CategoryMgmt--colRefreshLabel").setText("Last refreshed at " + formattedDateTime);
              this.getView().byId("FPage5CategoryMgmt--catTableRefreshLabel").setText("Last refreshed at " + formattedDateTime);
              this.getView().byId("FPage5CategoryMgmt--columnCard").setBusy(true);
              this.getView().byId("FPage5CategoryMgmt--pieCard").setBusy(true);

              const selectedExpert = this.getView().byId("FPage5CategoryMgmt--idoSelect1").getSelectedKey();
              const url = ALL_PROJECTS_BY_EXPERT_EP + '?expert=' + selectedExpert;
              // var vizFrame = this.getView().byId(this._constants.vizFrame.id);
              var vizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--chartContainerVizFrame");

              try {
                const options = { method: 'GET' };
                const response = await fetch(url, options);
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                var oModel = new JSONModel(data);
                vizFrame.setModel(oModel);

                this.getView().byId("FPage5CategoryMgmt--columnCard").setBusy(false);
                this.getView().byId("FPage5CategoryMgmt--pieCard").setBusy(false);
              } catch (error) {
                console.error("Error fetching data:", error);
                // Handle error, maybe stop the interval:
                clearInterval(this._autoRefreshInterval);
                this._autoRefreshInterval = null; // Clear the interval ID
                sap.m.MessageToast.show("Error loading data. Auto-refresh stopped.");
                this.getView().byId("FPage5CategoryMgmt--columnCard").setBusy(false);
                this.getView().byId("FPage5CategoryMgmtpieCard").setBusy(false);
              }
            }, 5000); // 5000 milliseconds = 5 seconds
          }

        } else {
          // localStorage.setItem("AUTO-REFRESH", "false");
          if (this._autoRefreshInterval) {
            clearInterval(this._autoRefreshInterval);
            this._autoRefreshInterval = null; // Important: Clear the interval ID
          }
        }
      },

      onClusterExpAutoRefresh: async function (oEvent) {
        /** [TODO] AUTO REFRESH FEATURE
        * 1. Cluster Analysis main chart (d3): refresh overalls
        * 2. Project Distribution chart (d3): disable auto refresh, refresh overalls
        */

        var oState = oEvent.getParameter("state");

        if (oState) {
          localStorage.setItem("AUTO-REFRESH", "true");

        } else {
          localStorage.setItem("AUTO-REFRESH", "false");
        }

      },
      generateOntologyData: function () {
        // ... (same generateOntologyData function from your original code) ...
        const nodeCategories = {
          class: { icon: "sap-icon://drill-up" },
          instance: { icon: "sap-icon://instance" },
          dataProperty: { icon: "sap-icon://key" },
          objectProperty: { icon: "sap-icon://chain-link" }
        };
        const groups = [
          { key: "g1", title: "Classes" },
          { key: "g2", title: "Instances" },
          { key: "g3", title: "Properties" }
        ];

        const nodes = [
          // ... (your nodes data) ...
          {
            key: "n1",
            title: "TechnicalAdvisor",
            icon: nodeCategories.class.icon,
            group: "g1",
            attributes: [
              { label: "Type", value: "Class" }
            ]
          },
          {
            key: "n2",
            title: "TechnicalIssue",
            icon: nodeCategories.class.icon,
            group: "g1",
            attributes: [
              { label: "Type", value: "Class" }
            ]
          },
          {
            key: "n3",
            title: "Solution",
            icon: nodeCategories.class.icon,
            group: "g1",
            attributes: [
              { label: "Type", value: "Class" }
            ]
          },
          {
            key: "n4",
            title: "Equipment",
            icon: nodeCategories.class.icon,
            group: "g1",
            attributes: [
              { label: "Type", value: "Class" }
            ]
          },
          {
            key: "n5",
            title: "MaintenanceRecord",
            icon: nodeCategories.class.icon,
            group: "g1",
            attributes: [
              { label: "Type", value: "Class" }
            ]
          },
          {
            key: "n6",
            title: "Advisor_001",
            icon: nodeCategories.instance.icon,
            group: "g2",
            attributes: [
              { label: "Type", value: "TechnicalAdvisor" },
              { label: "Expertise", value: "Hydraulics" }
            ]
          },
          {
            key: "n7",
            title: "Issue_XYZ",
            icon: nodeCategories.instance.icon,
            group: "g2",
            attributes: [
              { label: "Type", value: "TechnicalIssue" },
              { label: "Priority", value: "High" }
            ]
          },
          {
            key: "n8",
            title: "Solution_ABC",
            icon: nodeCategories.instance.icon,
            group: "g2",
            attributes: [
              { label: "Type", value: "Solution" },
              { label: "Approved", value: "Yes" }
            ]
          },
          {
            key: "n9",
            title: "hasExpertise",
            icon: nodeCategories.dataProperty.icon,
            group: "g3",
            attributes: [
              { label: "Type", value: "DataProperty" }
            ]
          },
          {
            key: "n10",
            title: "resolves",
            icon: nodeCategories.objectProperty.icon,
            group: "g3",
            attributes: [
              { label: "Type", value: "ObjectProperty" }
            ]
          },
          {
            key: "n11",
            title: "assignedTo",
            icon: nodeCategories.objectProperty.icon,
            group: "g3",
            attributes: [
              { label: "Type", value: "ObjectProperty" }
            ]
          },
          {
            key: "n12",
            title: "requiresEquipment",
            icon: nodeCategories.objectProperty.icon,
            group: "g3",
            attributes: [
              { label: "Type", value: "ObjectProperty" }
            ]
          }
        ];

        const lines = [
          { from: "n1", to: "n6", title: "instanceOf" },
          { from: "n2", to: "n7", title: "instanceOf" },
          { from: "n3", to: "n8", title: "instanceOf" },
          { from: "n6", to: "n7", title: "assignedTo" },
          { from: "n8", to: "n7", title: "resolves" },
          { from: "n8", to: "n4", title: "requiresEquipment" },
          { from: "n5", to: "n4", title: "relatesToEquipment" },
          { from: "n10", to: "n3", title: "domain" },
          { from: "n10", to: "n2", title: "range" },
          { from: "n11", to: "n2", title: "domain" },
          { from: "n11", to: "n1", title: "range" }
        ];

        return {
          nodes: nodes,
          lines: lines,
          groups: groups
        };
      },

      onZoomIn: function () {
        this._graph.zoomIn();
      },

      onZoomOut: function () {
        this._graph.zoomOut();
      },

      onResetGraph: function () {
        this._graph.reset();
        MessageToast.show("Graph Reset");
      },

      onLinePress: function (oEvent) {
        const oLine = oEvent.getSource();
        MessageToast.show("Relationship: " + oLine.getTitle());
      },

      onInit: function () {
        const ontologyData = this.generateOntologyData();
        const xoModel = new JSONModel(ontologyData);
        this.getView().setModel(xoModel);

        // Initialize the process flow model
        var oModel = new sap.ui.model.json.JSONModel({
          nodes: [
            { key: "1", title: "Step 1: Ask Me Anything", icon: "sap-icon://headset", status: "Warning", shape: "Circle" },
            { key: "1a", title: "Step 2: Generate SPARQL query from user's entry", icon: "", status: "Warning", shape: "Box" },
            { key: "2", title: "Retrieve data using Knowledge Graph engine", icon: "sap-icon://instance", status: "Warning", shape: "Circle", group: "1" },
            { key: "3", title: "Step 4: Display and explore Knowledge Graph data & ontology", icon: "sap-icon://accept", status: "Warning", shape: "Circle" },
            
          ],
          lines: [
            { from: "1", to: "1a" },
            { from: "1a", to: "2" },
            { from: "2", to: "3" }
          ],
          groups: [{ key: "1", title: "Step 3: Use SAP Knowledge Graph engine" },] // Initialize groups array
        });

        this.getView().setModel(oModel, "processflow");
        
        this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").setCurrentZoomLevel(0.8);

      //   // Temp
      //   var oEmptyModel = new sap.ui.model.json.JSONModel({
      //     nodes: [{ key: "1", title: "Step 1: Ask Me Anything", icon: "sap-icon://headset", status: "Warning", shape: "Circle" }],
      //     lines: [],
      //     groups: []
      //   });
      //   // const networkGraphModel = generateNetworkGraphModel(exampleSqlSelectQuery, completeOntologyTTL);
      //   this.getView().setModel(oEmptyModel, "kgresults");

      //   var oBinding = this.getView().byId("FPage7EnhancedAdvisoryBuddy--processFlowGraph").getBinding("nodes");
      //   console.log(oBinding);
      //   // this.getGraph().getBinding("nodes");

			// // if (sKey === "nodata") {
			// 	var oFilter = new Filter({
			// 		path: "key",
			// 		value1: "XXXXX",
			// 		operator: FilterOperator.EQ
			// 	});

			// 	oBinding.filter(oFilter);

        // console.log(this.getView().byId("FPage7EnhancedAdvisoryBuddy--graphViewKGResults").getNoData());

        // this.getView().byId("FPage7EnhancedAdvisoryBuddy--graphViewKGResults").setNoData(true)

        /** [TODO] Learning Plan Assignment */
        // this.initMockDataForLearningPlanAssignmentDragDrop();
        // this.attachDragAndDrop();
        getClusterData()
          .then(data => {
            pieCategoryData = data;
            // console.log(JSON.stringify(data, null, 2)); // Nicely formatted output
            // Fetch data from API and bind to the model
            const oModel = new JSONModel();
            oModel.setData({
              clusters: data,
              originalData: data, // Backup of original data for cancel functionality
              isEditMode: false // Edit mode flag
            }); // Bind data to the model
            this.getView().setModel(oModel, "categorymgmt");

            oModel.setProperty("/originalData", JSON.parse(JSON.stringify(data))); // Deep copy for backup

            // Initialize model with data and isEditMode flag
          });

        var oDeviceModel = new JSONModel(Device);
        this.getView().setModel(oDeviceModel, "device");

        var oModel = new JSONModel(sap.ui.require.toUrl("chat/model/data.json"));
        this.getView().setModel(oModel, "nav");

        //  Shifted to onAfterRendering due to parent-child XML views rendering
        // this._setToggleButtonTooltip(!Device.system.desktop);
        // Device.media.attachHandler(this._handleMediaChange, this);
        // this._handleMediaChange();
        // this.byId("sideNavigation").setSelectedKey("page1");

        // var catVizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--piechartContainerVizFrame");
        // var colVizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--chartContainerVizFrame");

        // var oVizFrame = this.getView().byId(this.createId("FPage5CategoryMgmt--" + this._constants.vizFrame));
        // var oVizFrame = this.getView().byId(this._constants.vizFrame.id);
        var oVizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--chartContainerVizFrame");
        this._updateVizFrame(oVizFrame);

        // var oPieVizFrame = this.getView().byId(this.createId("FPage5CategoryMgmt--" + this._pieconstants.vizFrame));
        var oPieVizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--piechartContainerVizFrame");
        this._updatePieVizFrame(oPieVizFrame);

        // this.oRouter = this.getOwnerComponent().getRouter();
        // this.oRouter.attachRouteMatched(this.onRouteMatched, this);
        // this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
        document.addEventListener('keydown', this.handleKeyDown.bind(this)); // Bind 'this'
      },

      _updateVizFrame: async function (vizFrame) {
        var oVizFrame = this._constants.vizFrame;
        const url = ALL_PROJECTS_BY_EXPERT_EP + '?expert=Jules';
        const options = { method: 'GET' };

        try {
          const response = await fetch(url, options);
          const data = await response.json();
          var oModel = new JSONModel(data);
          var oDataset = new FlattenedDataset(oVizFrame.dataset);

          vizFrame.setVizProperties(oVizFrame.properties);
          vizFrame.setDataset(oDataset);
          vizFrame.setModel(oModel);
          this._addFeedItems(vizFrame, oVizFrame.feedItems);
          vizFrame.setVizType(oVizFrame.type);
        } catch (error) {
          console.error("In _updateVizFrame:");
          console.error(error);
        }
      },
      _addFeedItems: function (vizFrame, feedItems) {
        for (var i = 0; i < feedItems.length; i++) {
          vizFrame.addFeed(new FeedItem(feedItems[i]));
        }
      },

      _updatePieVizFrame: async function (vizFrame) {
        var oVizFrame = this._pieconstants.vizFrame;
        const options = { method: 'GET' };

        try {
          const response = await fetch(ALL_PROJECTS_CATEGORIES_EP, options);
          const data = await response.json();
          var xx = transformDataForCategoryPieGlobal(data);
          var oModel = new JSONModel(xx);
          var oDataset = new FlattenedDataset(oVizFrame.dataset);

          vizFrame.setVizProperties(oVizFrame.properties);
          vizFrame.setDataset(oDataset);
          vizFrame.setModel(oModel);
          this._addPieFeedItems(vizFrame, oVizFrame.feedItems);
          vizFrame.setVizType(oVizFrame.type);
        } catch (error) {
          console.error("In _updatePieVizFrame:");
          console.error(error);
        }
      },
      _addPieFeedItems: function (vizFrame, feedItems) {
        for (var i = 0; i < feedItems.length; i++) {
          vizFrame.addFeed(new FeedItem(feedItems[i]));
        }
      },

      settingsModel: {
        dataset: {
          name: "Custom Popover",
          defaultSelected: 0,
          values: [{
          }, {
          }, {
            name: "Custom Content Pie Chart",
            value: null,
            popoverProps: {
              'customDataControl': function (data) {
                if (data.data.val) {
                  // console.log(pieCategoryData);

                  var values = data.data.val;
                  var divStr = "";
                  var idx = values[1].value;
                  // console.log(values);

                  // console.log("idx:", idx, "exData.length:", exData.length); // Debugging

                  const categoryValueFromB = values.find(item => item.id === "Category")?.value;
                  const matchingCluster = pieCategoryData.find(item => item.category_label === categoryValueFromB);
                  // console.log(matchingCluster.cluster_description);
                  var categoryDescToDisplay;
                  if (matchingCluster) {
                    categoryDescToDisplay = matchingCluster.category_descr;
                  } else {
                    categoryDescToDisplay = "No matching description"
                  }

                  var svg = "<svg width='10px' height='10px'><path d='M-5,-5L5,-5L5,5L-5,5Z' fill='#5cbae6' transform='translate(5,5)'></path></svg>";
                  divStr += "<div style = 'margin: 15px 30px 0 10px'>" + svg + "<b style='margin-left:10px'>" + values[0].value + "</b></div>";
                  divStr += "<div style = 'margin: 5px 30px 0 30px'>" + "<span style = 'float: left'>" + categoryDescToDisplay + "</span><br></div>";
                  divStr += "<div style = 'margin: 5px 30px 15px 30px'>" + "Total No. of Projects: <span style = 'float: right'>" + values[1].value + "</span></div>";
                  return new HTMLControl({ content: divStr });

                  // if (idx >= 0 && idx < exData.length) {
                  //   var svg = "<svg width='10px' height='10px'><path d='M-5,-5L5,-5L5,5L-5,5Z' fill='#5cbae6' transform='translate(5,5)'></path></svg>";
                  //   divStr += "<div style = 'margin: 15px 30px 0 10px'>" + svg + "<b style='margin-left:10px'>" + values[0].value + "</b></div>";
                  //   divStr += "<div style = 'margin: 5px 30px 0 30px'>Total No. of Projects: <span style = 'float: right'>" + values[1].value + "</span></div>";
                  //   divStr += "<div style = 'margin: 5px 30px 0 30px'>" + "<span style = 'float: right'>" + categoryDescToDisplay + "</span></div>";
                  //   return new HTMLControl({ content: divStr });
                  // } else {
                  //   console.error("Index out of bounds:", idx);
                  //   return new HTMLControl({ content: "Data not available" }); // Or return ""
                  // }

                } else {
                  console.error("data.data.val is undefined or null"); // Handle missing data
                  return new HTMLControl({ content: "Data not available" }); // Or return ""
                }
              }
            }
          },
          {
            name: "Custom Content for Column Chart",
            value: null,
            popoverProps: {
              'customDataControl': function (data) {
                if (data.data.val) {
                  // console.log(pieCategoryData);

                  var values = data.data.val;
                  var divStr = "";
                  var idx = values[1].value;
                  // console.log(values);

                  // console.log("idx:", idx, "exData.length:", exData.length); // Debugging

                  const categoryValueFromB = values.find(item => item.id === "Category")?.value;
                  const matchingCluster = pieCategoryData.find(item => item.category_label === categoryValueFromB);
                  // console.log(matchingCluster.cluster_description);
                  var categoryDescToDisplay;
                  if (matchingCluster) {
                    categoryDescToDisplay = matchingCluster.category_descr;
                  } else {
                    categoryDescToDisplay = "No matching description"
                  }

                  var svg = "<svg width='10px' height='10px'><path d='M-5,-5L5,-5L5,5L-5,5Z' fill='#5cbae6' transform='translate(5,5)'></path></svg>";
                  divStr += "<div style = 'margin: 15px 30px 0 10px'>" + svg + "<b style='margin-left:10px'>" + values[0].value + "</b></div>";
                  divStr += "<div style = 'margin: 5px 30px 0 30px'>" + "<span style = 'float: left'>" + categoryDescToDisplay + "</span><br><br></div>";
                  divStr += "<div style = 'margin: 5px 30px 15px 30px'>" + "Total No. of Projects: <span style = 'float: right'>" + values[2].value + "</span></div>";
                  return new HTMLControl({ content: divStr });


                } else {
                  console.error("data.data.val is undefined or null");
                  return new HTMLControl({ content: "Data not available" });
                }
              }
            }
          }]
        }
      },

      onAfterRendering: function () {
        //  Parent-Child views rendering
        // this._setToggleButtonTooltip(!Device.system.desktop);
        Device.media.attachHandler(this._handleMediaChange, this);
        this._handleMediaChange();
        this.getView().byId("sideNavigation").setSelectedKey("page1");

        fetch(ALL_PROJECTS_EP, { method: 'GET' }) // No 'await' here
          .then(response => response.json())
          .then(data => {
            var oProjects = new JSONModel(data);
            this.getView().setModel(oProjects, "projects");
            var oSettingsModel = new JSONModel({ navigatedItem: "" });
            this.getView().setModel(oSettingsModel, 'settings');

            // ... your DOM manipulation code (but see note below about timing)
          })
          .catch(error => {
            console.error("In onAfterRendering:");
            console.error(error);
          });


        /** Methods to connect click popover on charts */
        var catVizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--piechartContainerVizFrame");
        var oPopOverPie = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--idPopOverPie");
        /** [TODO] Improve Popover to include Cluster Desecription */
        // var xxjson = { 'customDataControl': function (data) { if (data.data.val) { var exData = [{ "Owner": "Brooks A. Williams", "Phone": "778-721-2235" }, { "Owner": "Candice C. Bernardi", "Phone": "204-651-2434" }, { "Owner": "Robert A. Cofield", "Phone": "262-684-6815" }, { "Owner": "Melissa S. Maciel", "Phone": "778-983-3365" }, { "Owner": "Diego C. Lawton", "Phone": "780-644-4957" }, { "Owner": "Anthony K. Evans", "Phone": "N/A" }, { "Owner": "Sue K. Gonzalez", "Phone": "647-746-4119" }, { "Owner": "Nancy J. Oneal", "Phone": "N/A" }, { "Owner": "Sirena C. Mack", "Phone": "905-983-3365" }, { "Owner": "Gloria K. Bowlby", "Phone": "N/A" }]; var values = data.data.val, divStr = "", idx = values[1].value; var svg = "<svg width='10px' height='10px'><path d='M-5,-5L5,-5L5,5L-5,5Z' fill='#5cbae6' transform='translate(5,5)'></path></svg>"; divStr = divStr + "<div style = 'margin: 15px 30px 0 10px'>" + svg + "<b style='margin-left:10px'>" + values[0].value + "</b></div>"; divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + values[2].name + "<span style = 'float: right'>" + values[2].value + "</span></div>"; divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "Owner<span style = 'float: right'>" + exData[idx].Owner + "</span></div>"; divStr = divStr + "<div style = 'margin: 5px 30px 15px 30px'>" + "Phone<span style = 'float: right'>" + exData[idx].Phone + "</span></div>"; return new HTMLControl({ content: divStr }); } } };
        // console.log(xxjson);
        oPopOverPie = new Popover(this.settingsModel.dataset.values[2].popoverProps);
        oPopOverPie.connect(catVizFrame.getVizUid());

        var colVizFrame = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--chartContainerVizFrame");
        var oPopOverCol = sap.ui.getCore().byId("container-chat---App--FPage5CategoryMgmt--idPopOverCol");
        oPopOverCol = new Popover(this.settingsModel.dataset.values[3].popoverProps);
        oPopOverCol.connect(colVizFrame.getVizUid());
      },

      onSearchPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page2"));
        this.byId("sideNavigation").setSelectedKey("page2");
      },
      onKBPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page3"));
        this.byId("sideNavigation").setSelectedKey("page3");
      },
      onClusterExpPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page4"));
        this.byId("sideNavigation").setSelectedKey("page4");
      },
      onCatMgmtPress: function (oEvent) {
        this.byId("pageContainer").to(this.getView().createId("page5"));
        this.byId("sideNavigation").setSelectedKey("page5");
      },

      onNavItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("item");
        this.byId("pageContainer").to(this.getView().createId(oItem.getKey()));
        // console.log(oItem.getKey());
        if (oItem.getKey() == "page6") {
          this.setAppBusy(true);
          var that = this;
          setTimeout(function () {
            that.setAppBusy(false);
          }, 2000);
        }

        /** Phone ONLY */
        var rangeName = Device.media.getCurrentRange("StdExt").name;
        if (rangeName == "Phone") {
          var oToolPage = this.byId("toolPage");
          var bSideExpanded = oToolPage.getSideExpanded();

          // this._setToggleButtonTooltip(bSideExpanded);

          oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        }
      },

      onSideNavMenuButtonPress: function () {
        var oToolPage = this.byId("toolPage");
        var bSideExpanded = oToolPage.getSideExpanded();
        // this._setToggleButtonTooltip(bSideExpanded);
        oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
      },

      _setToggleButtonTooltip: function (bLarge) {
        var oToggleButton = this.getView().byId('sideNavigationToggleButton');
        if (bLarge) {
          oToggleButton.setTooltip('Large Size Navigation');
        } else {
          oToggleButton.setTooltip('Small Size Navigation');
        }
      },

      formatMatchingScoreColor: function (score) {
        if (score < 0.45) {
          return 4;
        } else {
          return 8;
        }
      },

      formatMatchingScore: function (value) {
        return Math.round(value * 10000) / 10000;
      },

      _handleMediaChange: function () {
        var rangeName = Device.media.getCurrentRange("StdExt").name;

        switch (rangeName) {
          // Shell Desktop
          case "LargeDesktop":
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            this.byId("sideNavigation").setExpanded(false);
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            // this.byId("searchField").setVisible(true);
            this.byId("spacer").setVisible(true);
            // this.byId("searchButton").setVisible(false);
            // MessageToast.show("Screen width is corresponding to Large Desktop");
            break;

          // Tablet - Landscape
          case "Desktop":
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            this.byId("sideNavigation").setExpanded(false);
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(false);
            // this.byId("searchField").setVisible(true);
            this.byId("spacer").setVisible(true);
            // this.byId("searchButton").setVisible(false);
            // MessageToast.show("Screen width is corresponding to Desktop");
            break;

          // Tablet - Portrait
          case "Tablet":
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            this.byId("sideNavigation").setExpanded(false);
            this.byId("productName").setVisible(true);
            this.byId("secondTitle").setVisible(true);
            // this.byId("searchButton").setVisible(true);
            // this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            // MessageToast.show("Screen width is corresponding to Tablet");
            break;

          case "Phone":
            // this.byId("searchButton").setVisible(true);
            this.byId("sideNavigationToggleButton").setVisible(true);
            this.byId("sideNavigation").setVisible(true);
            // this.byId("searchField").setVisible(false);
            this.byId("spacer").setVisible(false);
            this.byId("productName").setVisible(true);
            // this.byId("productName").setTitleStyle("{ fontSize: '0.2em'}");
            // console.log(this.byId("productName").getTitleStyle());
            // this.byId("productName").setStyle("fontSize", "20px");
            this.byId("productName").setTitleStyle("H6");
            this.byId("secondTitle").setVisible(false);
            this.byId("profile").setVisible(false);
            // MessageToast.show("Screen width is corresponding to Phone");
            // console.log(document.getElementById("container-chat---App--demoGrid-item-container-chat---App--pieCard"));
            // document.getElementById("container-chat---App--demoGrid-item-container-chat---App--pieCard").style.gridArea="span 7 / span 5";
            this.byId("FPage4ClusterExp--scatterCard").setHeight("600px");
            break;
          default:
            break;
        }
      },

      onExit: function () {
        Device.media.detachHandler(this._handleMediaChange, this);
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      },

      onDeleteChat: async function (evt) {
        this.setAppBusy(true);
        const uiModel = this.getView().getModel("ui");
        const objectBinding = evt.getSource().getObjectBinding();
        objectBinding.setParameter(
          "sessionId",
          uiModel.getProperty("/sessionId")
        );
        await objectBinding.execute();
        this.getView().getModel("chat").setProperty("/", []);
        uiModel.setProperty("/sessionId", window.crypto.randomUUID());
        this.setAppBusy(false);
      },

      onSendMessage: async function (evt) {
        this.setAppBusy(true);
        const userMessage = this.addUserMessageToChat(
          evt.getParameter("value")
        );
        const payload = {
          sessionId: this.getView().getModel("ui").getProperty("/sessionId"),
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        };

        try {
          const response = await this.askAiAssistent(payload);
          logger.info(JSON.stringify(response));
          this.addSystemMessageToChat(response);
        } catch (err) {
          this.addSystemMessageToChat({
            //content: "Error connecting to AI...",
            content: err.error?.message,
            timestamp: new Date().toJSON(),
          });
          logger.error(err);
        }
        this.setAppBusy(false);
      },

      setAppBusy: function (isBusy) {
        const uiModel = this.getView().getModel("ui");
        uiModel.setProperty("/enabled", !isBusy);
        uiModel.setProperty("/busy", isBusy);
      },

      askAiAssistent: async function (payload) {
        const url =
          this.getOwnerComponent().getManifestEntry("sap.app").dataSources
            .mainService.uri + "getAiResponse";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("fetch error...");
        }
      },

      addUserMessageToChat: function (content) {
        const chatModel = this.getView().getModel("chat");
        const userMessage = {
          timestamp: new Date().toJSON(),
          content: content,
          role: "user",
          icon: "sap-icon://person-placeholder",
        };
        chatModel.getProperty("/").push(userMessage);
        chatModel.updateBindings(true);
        return userMessage;
      },

      addSystemMessageToChat: function (payload) {
        const chatModel = this.getView().getModel("chat");
        const systemMessage = {
          timestamp: payload.timestamp,
          content: payload?.content,
          role: "system",
          icon: "sap-icon://ai",
        };
        chatModel.getProperty("/").push(systemMessage);
        chatModel.updateBindings(true);
        return systemMessage;
      },
      
    });
  }
);
