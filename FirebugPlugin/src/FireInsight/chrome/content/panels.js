/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Initial Developer of the Original Code is Christoph Dorn.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *     Christoph Dorn <christoph@christophdorn.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/* 
 * Copyright 2009 Steven Gao. 
 * Author: Steven Gao
 * 
 * This Firebug extension borrows heavily from the CodeBurner and FireRainbow 
 * Firebug extensions. 
 * 
 * CodeBurner: http://tools.sitepoint.com/codeburner/
 * FireRainbow: http://xrefresh.com/rainbow/
 */ 

FBL.ns(function() 
{
	with (FBL) /* TODO: Get rid of with() statement, use var fbl = FBL; instead */ 
	{
		var insightPrefix = "____";

		var mxBasePath = "var mxBasePath = 'http://www.mxgraph.com/demo/mxgraph/src/';";

		var mxGraphLibURL = "http://www.mxgraph.com/demo/mxgraph/src/js/mxclient.php?version=1.0.1.0&key=hnaAe6eohX6cmCE%3D";

		var mxGraphContainerSourceURL = "chrome://insight/content/mxGraph.js";
		
		/**
		 * Widget object 
		 */		
		function Widget(domNode) 
		{
			this.myNode = domNode;
		
			this.propertyString = function() 
			{
				var myArray = new Array();
				for(x in this.myNode) {
					try {
				 		if(x.charAt(0) === '_') {
							myArray.push(x);              
						}
					} 
					catch(e) 
					{ }
				}
				myArray.sort();
				return myArray.toString();
			}
		}		

		/**
		 * NodeTable object 
		 */		
		function NodeTable() 
		{
			this.tagTable = new Object();
			
			this.addNode = function(widget) 
			{
				var tags = this.tagTable[widget.myNode.tagName];
				if(tags === undefined || tags === null) 
				{
					tags = new Object();
					this.tagTable[widget.myNode.tagName] = tags;
		 		}
		 		var objClass = tags[widget.propertyString()];
		 		if(objClass === undefined || objClass === null) 
		 		{
					objClass = new Array();
					tags[widget.propertyString()] = objClass;
		 		}
		 		objClass.push(widget);
			}
		}

		/*----------------------------------------------------------------------------- 
		 * FireInsight Panel - FireInsight panel goes in the main group
		 *-----------------------------------------------------------------------------*/
		function FireInsightPanel() {}
		 
		FireInsightPanel.prototype = extend(Firebug.Panel, 
		{ 
		    name: Firebug.FireInsightModule.panelNames['fireInsight'], //"fireInsight", 
		    title: "Fire Insight", 
		    parentPanel: "html",
		    contextList: null,
		    sourceFileList: [],

			initialize: function()
			{
				Firebug.Panel.initialize.apply(this, arguments);
				FBTrace.sysout("FireInsightPanel: Initialize ");
                FBTrace.sysout("FireInsightPanel: Looking for this.panelNode", this.panelNode);
                this.getJSFiles(this.sourceFileList);
               	FBTrace.sysout("FireInsightPanel.sourceFileList", this.sourceFileList);                
			},
		    
		    /*************************************************************************** 
		     * Method: 
		     ***************************************************************************/
			beginsWithPrefix: function (strValue, strPrefix) 
			{
				/* If prefix variable is not a string, then we cannot do 
				 * prefix comparison 
				 */
				if (!(strPrefix.length) || strPrefix.length < 1)
				{
					//window.dump("FAILED Prefix Test: Prefix not a string\n");
					return false;
				}
				
				var strPrefixLength = strPrefix.length;
				
				if (!(strValue.length) || strValue.length < strPrefixLength)
				{
					//window.dump("FAILED Prefix Test: String Value not a string or had less characters than prefix \n");
					return false;
				}
				
				for (var i=0 ; i < strPrefixLength ; i++) 
				{
					if (strValue[i] !== strPrefix[i])
					{
						//window.dump("FAILED Prefix Test: String Value char=[" +strValue[i]+ "] !== prefix char=[" +strPrefix[i]+ "]\n");
						return false;
					}
				}
				
				return true;
			},		    
		    /*************************************************************************** 
		     * Method: 
		     ***************************************************************************/
			getPropsWithPrefix: function (obj, strPrefix) 
			{
				var objProps = [];

                try
                {
					for (var i in obj) 
					{
						if (this.beginsWithPrefix(i, strPrefix))
							objProps[i] = obj[i];
					}
                }
                catch (e)
                {
                    window.dump("ERROR: getPropsWithPrefix : object["+obj.toString()+"\n Message: " + e + "\n");
                }
                
				return objProps;
			},		    
		    /*************************************************************************** 
		     * Method: Calculate statistics for JavaScript source
		     ***************************************************************************/
			analyze: function() 
			{
				var theContextDocument = this.context.window.wrappedJSObject.window.document;
				var items = theContextDocument.getElementsByTagName('*');
				var item;
				var i=0;
				var len=items.length;
				var staticCount = 0;
				var dynamicCount = 0;
				var jsCount = 0;
				
				theContextDocument.fileTable = new Object();
				theContextDocument.nodeTable = new NodeTable();		    

               	FBTrace.sysout("FireInsightPanel: analyze # of nodes=" + len);				
				for(i=0; i<len; i++)
				{					
					item = items[i];
										
					if(item["____locator"])
					{
						//window.dump("item[" + (i+1) + "] : " +item.localName+ " has ___locater \n");
		            	jsCount++;
		                parts = item.____locator.split(':');
		                str = parts[1];
		                theContextDocument.fileTable[str] = true;
		                if(item.tagName !== 'BODY') 
		                {
		                	item.style.borderColor = 'red';
		                }
		                var widget = new Widget(item);
		                theContextDocument.nodeTable.addNode(widget);
					}
					var parentNode = item.parentNode; 
					if(parentNode.tagName === 'SPAN') 
					{
		            	if(parentNode.getAttribute('uri') !== null) 
		            	{
		                	staticCount++;
						} 
						else 
						{
		                	dynamicCount++;
		                }
					} 
					else 
					{
		           		dynamicCount++;
		           	}
				}
               	FBTrace.sysout("FireInsightPanel: analyze [document.fileTable]", theContextDocument.fileTable);				
               	FBTrace.sysout("FireInsightPanel: analyze [document.nodeTable]", theContextDocument.nodeTable);				
				FBTrace.sysout("------------------------- Nodes: " + i + " \tStatic: " + staticCount + " \tDynamic: " + dynamicCount + " \tJS: " + jsCount);							    	
			},
		    /*************************************************************************** 
		     * Method:
		     ***************************************************************************/
            refresh: function()
            {
            },
		    /*************************************************************************** 
		     * Method:
		     ***************************************************************************/
            show: function()
            {
                FBTrace.sysout("FireInsightPanel: showPanel : invoke analyze()");				    
                this.analyze();          	
            },
		    // return.path: group/category label, return.name: item label
		    getObjectDescription: function(sourceFile)
		    {
		    	var tempSourceFileDesc = sourceFile.getObjectDescription();
		    	//FBTrace.sysout("FireInsightPanel description.path=[" +tempSourceFileDesc.path+ "] : description.name=[" +tempSourceFileDesc.name+ "]", tempSourceFileDesc);
		        return sourceFile.getObjectDescription();
		    },
		    /*************************************************************************** 
		     * Method:
		     ***************************************************************************/
		    filterURI: function(fileURI) 
		    {
		        if (fileURI === null || fileURI === undefined)
		            return null;
		        var result = fileURI;
		        result = result.replace(/\:/g, "");
		        result = result.replace(/\&/g, "");
		        result = result.replace(/\?/g, "");
		        result = result.replace(/\=/g, "");
		        result = result.replace(/\%/g, "");
		        return result;
		    },
		    /*************************************************************************** 
		     * Method: Uses Firebug to retrieve listing of JS files related to the 
		     *         current page that Firebug is inspecting. This method iterates
		     *         over the listing of JS files and grabs a fresh copy of each, 
		     *         which will bypass the Script Insight instrumentation.
		     ***************************************************************************/
            getJSFiles: function(jsFileNames) 
            {
                try {
					// Iterate over properties for the selected object to determine if any insight 
					// properties have been added to this object. If yes, then record them for 
					// display in the FireInsight panel
					var p = null;		// Declare p here so we can refer to its value in catch block
	                var counter = 0;

		            //FBTrace.sysout("FireInsightPanel: Initialize : DOUBLE CHECK CONTEXT ", this.getLocationList());				    
		            var objects = this.getLocationList();
		
		            if (!objects)
		            {
		            	// Do something ...
		            }
		
		            window.dump("# of JS files: [" +objects.length+ "]\n");
		            
		            for (var i = 0; i<objects.length; i++)
		            {
		                var object = objects[i];
						// A description contains a path and a name like this:
						// path: "l.yimg.com/d"
						// name: "combo?ca/sp/js/yui_2.5.2.js&ca/sp/js/sp_0.2.1.js&ca/sp/js/pa_0.0.6.js"
		                var description = this.getObjectDescription(object);
		                
						if (!description)
		                    FBTrace.sysout("binding.xml popupshowing Fails" , object);
		                
						// Create entry to be stored in jsFilePaths list
						//var entry = {object: object, fileName: description.name};
						
				        var urlToFile = description.path+ "/" +description.name;
				        window.dump("JS File #[" +i+ "] ***** [" +urlToFile+ "] *****\n");
				        
						// Specific file, push it into an existing category
		                /*if (jsFilePaths.hasOwnProperty(description.path))
		                {
		                    jsFilePaths[description.path].push(entry);
		                }
		                // A new category, not a file
						else
		                {
		                    jsFilePaths[description.path] = [entry];	// Create a new array at the index description.path
		                }*/
		                
		                /* If this is a JS file */
		                if(description.name.substr(description.name.length - 2) === "js")
		                {
							description.path = this.filterURI(description.path);
							// Create directory if it does not exist yet.
							var directory = Cc["@mozilla.org/file/directory_service;1"]
												.getService(Components.interfaces.nsIProperties)
												.get("ProfD", Components.interfaces.nsIFile);

							// Get file handle for the current JS source code, create 
							// file if it does not exist yet.
							var file = Cc["@mozilla.org/file/directory_service;1"]
											.getService(Components.interfaces.nsIProperties)
											.get("ProfD", Components.interfaces.nsIFile);

							/* Create a special folder to save un-instrumented JavaScript files into */
							directory.append("fireInsightTempJS");
							if( !directory.exists() || !directory.isDirectory() ) {   // if directory doesn't exist or exists but not a directory, then create
							   directory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
							}
							file.append("fireInsightTempJS");
							
							/* Now construct the rest of the directory path structure */
							var pathTokens = description.path.split('/');
							var pathTokensLength = pathTokens.length;
							for (var j=0; j<pathTokensLength; j++) {
								file.append(pathTokens[j]);
								directory.append(pathTokens[j]);
								if( !directory.exists() || !directory.isDirectory() ) {   // if directory doesn't exist or exists but not a directory, then create
								   directory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
								}
							}

							window.dump("Directory =[" + directory.path + "]\n");
							window.dump("File PATH =[" + file.path + "]\n");
							window.dump("File NAME =[" + description.name + "]\n");
							//window.dump("File NAME TEST =[" + this.getFileName(description.name) + "]\n");
							file.append(description.name);
							window.dump("File PATH =[" + file.path + "]\n");
							
							if( !file.exists() ) {   // if file doesn't exist, create
								file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

								window.dump("CREATE file=[" + file.path + "]\n\n");																	
								//var obj_URI = Cc["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI("http://" + urlToFile, null, null);
								//window.dump("DOWNLOAD from [" + obj_URI + "] ... \n");
								//var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
								//persist.saveURI(obj_URI, null, null, null, "", file);
	
								/* Make Ajax request to retrieve current JS source code, tell proxy to 
								 * preserve original formatting of JS source and avoid adding 
								 * instrumented code */
								var xhr = new XMLHttpRequest();
								xhr.onreadystatechange = function() {
									if (xhr.readyState === 4) {
										if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
											alert(xhr.responseText);
										}
										else {
											alert("Ajax: Request was unsuccessful: " + xhr.status);
										}											
									}
								};
								xhr.open("get", "http://" + urlToFile, false);
								xhr.setRequestHeader("FireInsightIgnore", "true");
								xhr.send(null);
								
								//alert("Code for " + "http://" + urlToFile + "\nOriginal: [" + xhr.responseText + "]\n");
								
								// Save source code to the file
								this.writeFile(xhr.responseText, file);
							}
							else {
								window.dump("ALREADY EXISTS file=[" + file.path + "]\n\n");									
							}
							
							jsFileNames.push({uri: "http://" + urlToFile, path: file.path});
		                }
		            }

	            	//FBTrace.sysout("jsFilePaths", jsFilePaths);
	            	//FBTrace.sysout("jsFileNames", jsFileNames);
                }
                catch (e) {
                    alert("Error: " + e);
	                FBTrace.sysout("ERROR: FireInsightPanel : Initialize : " + e, e);
                }            	
            },
		    /*************************************************************************** 
		     * Method: Invoked every time user moves mouse during inspect mode, use this
		     *         to update/refresh the panel view
		     ***************************************************************************/
		    updateSelection: function(object)
		    {
	            try
	            {
					// Need to check if the object is wrapped using Firefox's XPCNativeWrapper 
			        // mechanism. If yes, then object will have a wrappedJSObject, and 
			        // access to user defined properties (like "____locator") will be inside 
			        // there 
			        if (object.wrappedJSObject)
			            var selectedElement = object.wrappedJSObject;
			        else
			            var selectedElement = object;
	                
	                if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
	                	FBTrace.sysout("FireInsightPanel: updateSelection", object);
	                
			        // Create basic layout for trace console content.
	                var rep = Firebug.FireInsightModule.PanelTemplate;
	                // Write output to FireInsight panel using domplate
	                // Display the initial view of the panel, with Attributes tab selected
	                try 
	                {
				        rep.tag.replace({}, this.panelNode, rep);
				        rep.selectTabByName(this.panelNode, "Attributes");
	                }
	                catch (e)
	                {
	                    alert("Error: " + e);
	                	window.dump("ERROR: FireInsightPanel: Initialize : " + e);
	                }

			        // This node is the container for all Attribute related logs.
			        var attributeTabContent = FBL.getElementByClass(this.panelNode, "traceInfoAttributesText");
			        this.attributesTable = Firebug.FireInsightModule.AttributeTableTemplate.createTable(attributeTabContent);

			        // This node is the container for all Event Handler related entries.
			        var eventHandlerTabContent = FBL.getElementByClass(this.panelNode, "traceInfoEventHandlersText");
			        this.eventHandlerTable = Firebug.FireInsightModule.EventHandlerTableTemplate.createTable(eventHandlerTabContent, rep, this);
					
					/* Create empty context list */					          
					this.contextList = new Array();
					
	                /* Iterate over all Script Insight anaylsis elements (p) attached to the 
	                 * currently selected DOM element (selectedElement). 
	                 */
	                try
	                {
			            //var jsFileNames = [];
			            //var jsFilePaths = {};
			            //this.getJSFiles(jsFileNames, jsFilePaths);
			            
	                	/* Examine all properties for the current selected item and filter
	                	 * out the Script Insight related properties (i.e. will have prefix
	                	 * of "____", look at var insightPrefix). 
	                	 */ 
					    for (p in selectedElement) 
					    {
				            if (this.beginsWithPrefix(p, insightPrefix))
				            {
				            	// Add the current Script Insight related property to the structure to 
				            	// display in FireInsight panel
				            	var currentElem = (selectedElement[p]).toString();
				            	var propName = p.toString().substr(insightPrefix.length);
				            	
				            	// TODO: Remove debugging line
				            	//FBTrace.sysout("currentElem=[" +currentElem+ "] : Type of currentElem=[" + (typeof currentElem) + "]");
				            	
				            	if (currentElem && typeof currentElem === "string")
				            	{
					            	if (propName === "eventHandlers") {
		                				
		                				// TODO: Remove debugging line
		                				//FBTrace.sysout(propName + " Event Handlers List", currentElem);
		                				
		                				var eventHandlerArray = currentElem.split(',');
		                				var numEventHandlers = eventHandlerArray.length;
		                				for (var k=0; k<numEventHandlers; k++) {
		                					//FBTrace.sysout("                  Event Handler " + k + "=[" + eventHandlerArray[k] + "]");
						            		var currentTraceMsg = 
						            			new Firebug.FireInsightModule.AttributeTraceMessage(
						            				eventHandlerArray[k], 
						            				currentElem, 
						            				this.sourceFileList /*jsFileNames*/);
							            	
							            	// Dump newly created trace message onto Event Handler Log Panel
								            this.dumpEventHandlerMsg(currentTraceMsg);
		                				}
				            		}
				            		else {
					            		var currentTraceMsg = 
					            			new Firebug.FireInsightModule.AttributeTraceMessage(
					            				propName, 
					            				currentElem, 
					            				this.sourceFileList /*jsFileNames*/);
					            			
					            		// Record the current message in a stack
					            		var traceContext = {
					            			contextName: currentTraceMsg.text,
					            			contextId: currentElem,
					            			contextStack: currentTraceMsg.stack
					            		}
					            		
					            		// Add to context list to be passed to mxGraph code
					            		this.contextList.push(traceContext);
						            	
						            	// Dump newly created trace message onto Attributes Log Panel
							            this.dumpAttributeMsg(currentTraceMsg);
				            		}
				            	}
					            //FBTrace.sysout("FireInsightPanel: updateSelection : OWNED property =[" + propName + "(" + p + "): " +selectedElement[p]+ "]");
				            }
					    }
	                }
	                catch (e)
	                {
	                    alert("Error: p=[" +p+ "] Type of p=[" +(typeof p)+ "]\n" + e);
		                FBTrace.sysout("ERROR: FireInsightPanel.updateSelection : " + e, e);
	                }

					this.loadMxGraph();
	            }
	            catch (e)
	            {
	                window.dump("ERROR: FireInsightPanel.updateSelection : " + e + "\n");
	                FBTrace.sysout("ERROR: FireInsightPanel.updateSelection : " + e, e);
	            }
	            //FBTrace.sysout("FireInsightPanel: updateSelection : CONTEXT =[" + this.context + "]", this.context);
		    },
		    /*************************************************************************** 
		     * Method: 
		     ***************************************************************************/
		    loadMxGraph: function(eventHandlerName) {
			        // Retrieve content for Hisotry tab. 
			        var historyBody = FBL.getElementByClass(this.panelNode, "traceInfoDMGText");
			        
			        /* Add MxGraph source scripts to the FireInsight panel 
			         */
	                var mxBasePathInclude = this.document.createElement("script");
	                var mxGraphLibInclude = this.document.createElement("script");
	                var mxGraphInclude = this.document.createElement("script");
	                
	                /* FIXME: Need to ensure that the below mxBasePath is inserted only once */
	                //FBTrace.sysout("mxBasePath", mxBasePathInclude);
	                mxBasePathInclude.innerHTML = mxBasePath;
	                mxGraphLibInclude.setAttribute("src", mxGraphLibURL);
	                mxGraphInclude.setAttribute("src", mxGraphContainerSourceURL);

	                var headElementArray = this.document.getElementsByTagName("head"); 
	                var headElement = null;
	                if (headElementArray[0] !== "undefined" && headElementArray[0] !== null) {
	                	headElement = headElementArray[0];
	                }
	                else {
	                	headElement = this.document.createElement("head");
	                }

					/* MxGraph Script Include #1 - Base path to library */
					if (this.containsScriptSrcLink(headElement.childNodes, mxBasePath) === false) {
						headElement.appendChild(mxBasePathInclude);
					}
					/* MxGraph Script Include #2 - JS Library */
					if (this.containsScriptSrcLink(headElement.childNodes, mxGraphLibURL) === false) {
		                headElement.appendChild(mxGraphLibInclude);
					}
					/* MxGraph Script Include #3 - Our MxGraph code */
					if (this.containsScriptSrcLink(headElement.childNodes, mxGraphContainerSourceURL) === false) {
		                headElement.appendChild(mxGraphInclude);
					}

	                /* Attempt to retrieve the div container for where the DMG graph will be 
	                 * displayed 
	                 */
	                var graphContainer = this.document.getElementById("graphContainer");
	                
	                /* If the div container does not exist yet, then add actual div tag to 
	                 * Side Panel to act as container for the grpah. This ensures graph container
	                 * is only added once.
	                 */ 
	                if (graphContainer === null || graphContainer === undefined) {
		                graphContainer = this.document.createElement('div');
		                graphContainer.id = "graphContainer";
						graphContainer.style.overflow = "visible";
						//graphContainer.style.position = "absolute";
						//graphContainer.style.left = "20px";
						//graphContainer.style.top = "25px";
						//graphContainer.style.right = "0px";
						//graphContainer.style.bottom = "0px";
						//graphContainer.style.background = "url(chrome://insight/content/images/grid.gif)";

						/* Actual container for the graph is embedded inside graphContainer, 
						 * because this allows us to add buttons above the graph without displacing 
						 * the actual graph 
						 */
						var embeddedGraphContainer = this.document.createElement('div');
		                embeddedGraphContainer.id = "embeddedGraphContainer";						
						embeddedGraphContainer.style.overflow = "visible";
						graphContainer.appendChild(embeddedGraphContainer);
	                }
	                
	                /* Add to container to historyBody */
	                historyBody.appendChild(graphContainer);
	                //FBTrace.sysout("graphContainer", graphContainer);
	                //FBTrace.sysout("graphContainer", this.document.getElementById("graphContainer"));
	                
	                /* FIXME: Test for passing data to mxgraph */
	                var testVertices = [
	                	"1@rssbar.js:dojo.js&2793,dojo.js&2757,rssbar.js&37,rssbar.js&57,rssbar.js&93",
	                	"2@rssbar.js:dojo.js&2793,dojo.js&2757,rssbar.js&37,rssbar.js&57,rssbar.js&93",
	                	"3@rssbar.js:dojo.js&2793,dojo.js&2757,rssbar.js&37,rssbar.js&57,rssbar.js&93",
	                	"4@rssbar.js:dojo.js&2793,dojo.js&2757,rssbar.js&37,rssbar.js&57,rssbar.js&93"];

	                /*FBTrace.sysout("---------------------------------------------------------------------------------------------------");
	                FBTrace.sysout("testVertices", testVertices);
	                FBTrace.sysout("Stringify testVertices", JSON.stringify(testVertices));
	                FBTrace.sysout("_globalStack", this.context.window.wrappedJSObject.window.document._globalStack);
	                FBTrace.sysout("Stringify _globalStack", JSON.stringify(this.context.window.wrappedJSObject.window.document._globalStack));
	                FBTrace.sysout("contextList", this.contextList);
	                FBTrace.sysout("Stringify contextList", JSON.stringify(this.contextList));
	                FBTrace.sysout("contextList[0]", this.contextList[0]);
	                FBTrace.sysout("---------------------------------------------------------------------------------------------------");
	                
	                FBTrace.sysout("historyBody", historyBody);
	                FBTrace.sysout("this.document.getElementsByTagName(\"head\")", this.document.getElementsByTagName("head"));*/

					if (eventHandlerName !== undefined && eventHandlerName !== null) {
						var dmgNodes = this.context.window.wrappedJSObject.window.document._globalStack[eventHandlerName];
						//FBTrace.sysout("typeof dmgNodes" + typeof dmgNodes, dmgNodes);
						var numDMGNodes = dmgNodes.length;
						
						/* Reset the context list to empty array */
						this.contextList = new Array();
						
						/* Now build new context list to be passed to mxGraph code */
						for (var j=0; j<numDMGNodes; j++) {
		            		var sliceIndex = dmgNodes[j].indexOf('::');
		            		var propName = dmgNodes[j].slice(insightPrefix.length, sliceIndex);
		            		var stackStr = dmgNodes[j].slice(sliceIndex+2);
		            		
		            		//FBTrace.sysout('dmgNodes[j]=' + dmgNodes[j]);
		            		//FBTrace.sysout('sliceIndex of ::=' + sliceIndex);
		            		//FBTrace.sysout('propName=' + propName);
		            		//FBTrace.sysout('stackStr=' + stackStr);
		            		
		            		var currentTraceMsg = 
		            			new Firebug.FireInsightModule.AttributeTraceMessage(
		            				propName, 
		            				stackStr, 
		            				this.sourceFileList);
		            			
		            		var traceContext = {
		            			contextName: currentTraceMsg.text,
		            			contextId: stackStr,
		            			contextStack: currentTraceMsg.stack
		            		}

		            		this.contextList.push(traceContext);
						}
					}

	                var traceBodyHistory = FBL.getElementByClass(this.panelNode, "traceInfoDMGTab traceInfoTab");
	                traceBodyHistory.setAttribute(
	                	"onclick", 
	                	"main(document.getElementById('embeddedGraphContainer'), " 
	                	+ JSON.stringify(this.contextList) 
	                	+ ")"
	                );
	                //traceBodyHistory.setAttribute("onclick", "main(document.getElementById('graphContainer'), " + JSON.stringify(testVertices) + ")");
	                //traceBodyHistory.setAttribute("onclick", "alert('disabled for now')");
		    },
		    /*************************************************************************** 
		     * Method: 
		     ***************************************************************************/
		     unloadMxGraph: function() {
			        // Retrieve content for Hisotry tab. 
			        var historyBody = FBL.getElementByClass(this.panelNode, "traceInfoDMGText");
	                var graphContainer = this.document.getElementById("graphContainer");
	                
	                // TODO: Remove the debugging statements below
	                //alert('unloadMxGraph');
	                //FBTrace.sysout('historyBody', historyBody);
	                //FBTrace.sysout('graphContainer', graphContainer);
	                
	                if (historyBody !== null && historyBody !== undefined) {
	                	if (graphContainer !== null && graphContainer != undefined) {
	                		historyBody.removeChild(graphContainer);
	                	}
	                }
		     },
		    /*************************************************************************** 
		     * Method: Used to determine whether to include source file
		     ***************************************************************************/
		    showThisSourceFile: function(sourceFile)
		    {
		        // Do not want to include Firebug related JS files
		        if (sourceFile.href.substr(0, 9) === "chrome://")
		            return false;
		
		        return true;
		    },
		    /*************************************************************************** 
		     * Method: Used to retrieve listing of all relevant JS files, this
		     *         excludes all JS files related to Firebug. We only want
		     *         JS files included on the actual HTML page.
		     ***************************************************************************/
		    getLocationList: function()
		    {
		        var context = this.context;
		        // Retrieve listing of source files as an array, using Firebug Lib function
		        var allSources = [];
		        var counter = 1;
			    for (url in context.sourceFileMap) {
			        window.dump("(" + (counter++) + ") url=" + url + "\n");
			        allSources.push(context.sourceFileMap[url]);
			    }
			    //FBTrace.sysout("sourceFilesAsArray sourcefiles="+allSources.length+"\n");
			    //FBTrace.sysout("context.sourceFileMap['http://gaotop:8080/petstore/faces/static/META-INF/dojo/bpcatalog/dojo.js']", context.sourceFileMap["http://gaotop:8080/petstore/faces/static/META-INF/dojo/bpcatalog/dojo.js"]);
		
	            if (FBTrace && FBTrace.DBG_FIREINSIGHT) {
	            	FBTrace.sysout("Firebug.FireInsightModule.getLocationList "+context.getName()+" allSources", allSources); /*@explore*/
	            	FBTrace.sysout("Firebug.FireInsightPanel.getLocationList context.sourceFileMap", context.sourceFileMap); /*@explore*/
	            }
	            
		        /*var filter = Firebug.getPref(Firebug.servicePrefDomain, "scriptsFilter");
		        this.showEvents = (filter === "all" || filter === "events");
		        this.showEvals = (filter === "all" || filter === "evals");*/
		
		        // Create listing of JS source files
		        var list = [];
		        for (var i = 0; i < allSources.length; i++)
		        {
		            if (this.showThisSourceFile(allSources[i]))
		                list.push(allSources[i]);
		        }
		
		        if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
		        	FBTrace.sysout("Firebug.FireInsightModule.getLocationList BEFORE iterateWindows ", list); /*@explore*/
		
				iterateWindows(context.window, function(win) 
				{
					if (FBTrace && FBTrace.DBG_FIREINSIGHT)                                                                                                /*@explore*/
		                FBTrace.sysout("Firebug.FireInsightModule.getLocationList iterateWindows: "+win.location.href + " documentElement: "+win.document.documentElement);  /*@explore*/
		            if (!win.document.documentElement)
		                return;
		            var url = win.location.href;
		            if (url)
		            {
		                if (context.sourceFileMap.hasOwnProperty(url))
		                    return;
		                var URLOnly = new NoScriptSourceFile(context, url);
		                context.addSourceFile(URLOnly);
		                
		                list.push(URLOnly);
		                if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
		                	FBTrace.sysout("Firebug.FireInsightModule.getLocationList created NoScriptSourceFile for URL:"+url, URLOnly);
		            }
		        });
		        if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
		        	FBTrace.sysout("Firebug.FireInsightModule.getLocationList ", list);  
		        return list;
		    },
		    
		    /*************************************************************************** 
		     * Method: Used to retrieve the file name from a file path that could 
		     *         potentially contain more than just the file name alone.
		     ***************************************************************************/
		    getFileName: function(pathName)
		    {
		    	var tokens = null;
				// determine the file-separator
				if (pathName.search(/\\/) != -1) {
					tokens = pathName.split("\\");
				} 
				else {
					tokens = pathName.split("/");
				}
		    	
		    	if (tokens && tokens.length > 0) {
		    		return tokens[tokens.length - 1]
		    	}
		    	
		    	return pathName;
		    },

		    /*************************************************************************** 
		     * Method: Used to retrieve the file name from a file path that could 
		     *         potentially contain more than just the file name alone.
		     ***************************************************************************/
		    writeFile: function(data, file)
		    {
			    //var data = "Appending Data";
			
			    //var filePath = "C:\\text.txt";
			
			    //var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
								.createInstance(Components.interfaces.nsIFileOutputStream);

			    window.dump("Writing file to [" +file.path+ "]\n");
			    //file.initWithPath(filePath);
			    
			    if ( file.exists() === false ) {
			    	alert("File does not exist");
			    	return;
			    }
	
				window.dump("Data [" +data.length+ "] chars\n");
		
				// write, create, truncate
				// In a c file operation, we have no need to set file mode with or operation,
				// directly using "r" or "w" usually.
				foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
			    foStream.write(data, data.length);
			    foStream.close();
		    },
		    		    
		    /* Message dump */
		    dumpAttributeMsg: function(message)
		    {		
		        Firebug.FireInsightModule.AttributeTableTemplate.dump(message, this.attributesTable.firstChild);
		    },
		    

		    /* Message dump */
		    dumpEventHandlerMsg: function(message)
		    {
		        Firebug.FireInsightModule.EventHandlerTableTemplate.dump(message, this.eventHandlerTable.firstChild);
		    },

		    /*************************************************************************** 
		     * Method: Search an array of objects for HTMLScriptElement objects. If  
		     * 		   HTMLScriptElement is found compare its src element to the given 
		     * 		   srcLink. If a match is found, then return true. Otherwise return 
		     * 		   false.
		     ***************************************************************************/
		    containsScriptSrcLink: function(array, srcLink) {
				if (this.classOf(array) === "NodeList" && (this.classOf(srcLink) === "String")) {
					for (var i=0; i <array.length; i++) {
						if (this.classOf(array[i]) === "HTMLScriptElement") {
							if (this.classOf(array[i].src) === "String" && array[i].src === srcLink) {
								//FBTrace.sysout("           URL FOUND " + i + "=[href=" + array[i].src + "]");
								return true;
							}
							else if (array[i].innerHTML && array[i].innerHTML === srcLink) {
								//FBTrace.sysout("           BASE PATH FOUND " + i + "=[path=" + array[i].innerHTML + "]");
								return true;
							}
						}
					}
				}
				return false;
		    },
		    		    
			classOf: function(o) {
				if (undefined === o) { 
					return "undefined";
				}
				if (null === o) { 
					return "null";
				}
				return {}.toString.call(o).slice(8, -1);
			}		    		    		    
		}); 

		//***********************************************************************************
		// Template representation for Fire Insight Panel (domplate)
		//***********************************************************************************
		Firebug.FireInsightModule.PanelTemplate = domplate(
		{
		    tag:
		        TABLE({class: "traceTable", cellpadding: 0, cellspacing: 0},
		            TBODY(
		                TR({class: "traceInfoRow"},
		                    TD({class: "traceInfoCol"},
		                        DIV({class: "traceInfoBody"},
		                            DIV({class: "traceInfoTabs"},
		                                A({class: "traceInfoAttributesTab traceInfoTab", onclick: "$onClickTab",
		                                    view: "Attributes"},
		                                    $STR("Attributes")
		                                ),
		                                A({class: "traceInfoDMGTab traceInfoTab", onclick: "$onClickTab",
		                                    view: "DMG"},
		                                    $STR("DMG")
		                                ),
		                                A({class: "traceInfoEventHandlersTab traceInfoTab", onclick: "$onClickTab",
		                                    view: "EventHandlers"},
		                                    $STR("Event Handlers")
		                                )
		                            ),
		                            DIV({class: "traceInfoAttributesText traceInfoText"}),
		                            DIV({class: "traceInfoDMGText traceInfoText"}),
		                            DIV({class: "traceInfoEventHandlersText traceInfoText"})
		                        )
		                    )
		                )
		            )
		        ),
		
		    onClickTab: function(event)
		    {
		        this.selectTab(event.currentTarget);
		    },
		
		    selectTabByName: function(parentNode, tabName)
		    {
		        var tab = getElementByClass(parentNode, "traceInfo" + tabName + "Tab");
		        if (tab)
		            this.selectTab(tab);
		    },
		
		    selectTab: function(tab)
		    {
		    	//FBTrace.sysout("TAB ", tab);
		        var messageInfoBody = tab.parentNode.parentNode;
		
		        var view = tab.getAttribute("view");
		        
		        if (messageInfoBody.selectedTab)
		        {
		            messageInfoBody.selectedTab.removeAttribute("selected");
		            messageInfoBody.selectedText.removeAttribute("selected");
		        }
		
		        var textBodyName = "traceInfo" + view + "Text";
		
		        messageInfoBody.selectedTab = tab;
		        messageInfoBody.selectedText = getChildByClass(messageInfoBody, textBodyName);
		
		        messageInfoBody.selectedTab.setAttribute("selected", "true");
		        messageInfoBody.selectedText.setAttribute("selected", "true");

		    	//FBTrace.sysout("Firebug.FireInsightModule.PanelTemplate textBodyName=[" + textBodyName + "] TAB", tab);		        
		    	//FBTrace.sysout("Firebug.FireInsightModule.PanelTemplate textBodyName=[" + textBodyName + "] MESSAGE INFO BODY", messageInfoBody);
		    }
		});

		//***********************************************************************************
		// Template representation for the attributes table within the Fire Insight Panel 
		// (domplate)
		//***********************************************************************************
		Firebug.FireInsightModule.AttributeTableTemplate = domplate(Firebug.Rep,
		{
		    inspectable: false,

		    tableTag:
		        TABLE({class: "messageTable", cellpadding: 0, cellspacing: 0},
		            TBODY()
		        ),
		
		    rowTag:
		        TR({class: "messageRow $message|getMessageType",
		            _repObject: "$message",
		            $exception: "$message|isException",
		            onclick: "$onClickRow"},
		            TD({class: "messageNameCol messageCol"},
		                DIV({class: "messageNameLabel messageLabel"},
		                    "$message|getMessageIndex")
		            ),
		            TD({class: "messageCol"},
		                DIV({class: "messageLabel", title: "$message|getMessageTitle"},
		                    "$message|getMessageLabel")
		            )
		        ),
		
		    separatorTag:
		        TR({class: "messageRow separatorRow", _repObject: "$message"},
		            TD({class: "messageCol", colspan: "2"},
		                DIV("$message|getMessageIndex")
		            )
		        ),
		
		    bodyRow:
		        TR({class: "messageInfoRow"},
		            TD({class: "messageInfoCol", colspan: 8})
		        ),
		
		    bodyTag:
		        DIV({class: "messageInfoBody", _repObject: "$message"},
		            DIV({class: "messageInfoTabs"},
		                A({class: "messageInfoStackTab messageInfoTab", onclick: "$onClickTab",
		                    view: "Stack"},
		                    $STR("tracing.tab.Stack")
		                )
		            ),
		            DIV({class: "messageInfoStackText messageInfoText"},
		                TABLE({class: "messageInfoStackTable", cellpadding: 0, cellspacing: 0},
		                    TBODY(
		                        FOR("stack", "$message|stackIterator",
		                            TR(
		                                TD({class: "stackFrame"},
		                                    A({class: "stackFrameLink", onclick: "$onClickStackFrame",
		                                        lineNumber: "$stack.lineNumber", 
		                                        filePath: "$stack.filePath"},
		                                        "$stack.fileName"),
		                                    SPAN("&nbsp;"),
		                                    SPAN("(", "$stack.lineNumber", ")"),
		                                    SPAN("&nbsp;"),
		                                    A({class: "openDebugger", onclick: "$onOpenDebugger",
		                                        lineNumber: "$stack.lineNumber",
		                                        fileName: "$stack.fileName"},
		                                        "[...]")
		                                )
		                            )
		                        )
		                    )
		                )
		            )
		        ),

		    // Data providers
		    getMessageType: function(message)
		    {
		        return message.getType();
		    },

		    getMessageIndex: function(message)
		    {
		        return message.index + 1;
		    },

		    getMessageTitle: function(message)
		    {
		        return message.getLabel(-1);
		    },

		    getMessageLabel: function(message)
		    {
		        var maxLength = Firebug.getPref(Firebug.TraceModule.prefDomain,
		            "trace.maxMessageLength");
		        return message.getLabel(maxLength);
		    },

		    isException: function(message)
		    {
		        return message.getException();
		    },

		    // Stack frame support
		    stackIterator: function(message)
		    {
		        return message.getStackArray();
		    },

		    // Implementation
		    createTable: function(parentNode)
		    {
		        return this.tableTag.replace({}, parentNode, this);
		    },
    
		    // Opens a separate window to show the JS source code
		    onClickStackFrame: function(event)
		    {
		        try 
		        {
			        var winType = "FBTraceConsole-SourceView";
			        var lineNumber = event.target.getAttribute("lineNumber");
			        var filePath = event.target.getAttribute("filePath");

	                window.dump("Firebug.FireInsightModule.AttributeTableTemplate.onClickStackFrame : event.target.innerHTML=[" + event.target.innerHTML + "]\n");
	                window.dump("Firebug.FireInsightModule.AttributeTableTemplate.onClickStackFrame : event.target.innerHTML UNESCAPED=[" + event.target.innerHTML.replace(/&amp;/g, "&") + "]\n");
					
			        openDialog("chrome://global/content/viewSource.xul",
			            winType, "all,dialog=no",
			            filePath.replace(/&amp;/g, "&"), null, null, lineNumber, false);
			        
			        //FBTrace.sysout("onClickStackFrame", event);
			        //FBTrace.sysout("onClickStackFrame filePath=[" + filePath + "] lineNumber=[" + lineNumber + "]");
		        }
	            catch (e)
	            {
	                window.dump("ERROR: Firebug.FireInsightModule.AttributeTableTemplate.onClickStackFrame : " + e + "\n");
	                FBTrace.sysout("ERROR: Firebug.FireInsightModule.AttributeTableTemplate.onClickStackFrame : " + e, e);
	            }
		    },

		    onOpenDebugger: function(event)
		    {
		        var target = event.target;
		        var lineNumber = target.getAttribute("lineNumber");
		        var fileName = target.getAttribute("fileName");
		
		        if (typeof(ChromeBugOpener) === "undefined")
		            return;
		
		        // Open Chromebug window.
		        var cbWindow = ChromeBugOpener.openNow();
		        FBTrace.sysout("Chromebug window has been opened", cbWindow);
		
		        // xxxHonza: Open Chromebug with the source code file, scrolled automatically
		        // to the specified line number. Currently chrome bug doesn't return the window
		        // from ChromeBugOpener.openNow method. If it would be following code opens
		        // the source code file and scrolls to the given line.
		
		        // Register onLoad listener and open the source file at the specified line.
		        if (cbWindow) {
		            cbWindow.addEventListener("load", function() {
		                var context = cbWindow.FirebugContext;
		                var link = new cbWindow.FBL.SourceLink(fileName, lineNumber, "js");
		                context.chrome.select(link, "script");
		            }, true);
		        }
		    },

		    // Body of the message.
		    onClickRow: function(event)
		    {
		        if (isLeftClick(event))
		        {
		            var row = getAncestorByClass(event.target, "messageRow");
		            if (row)
		            {
		                this.toggleRow(row);
		                cancelEvent(event);
		            }
		        }
		    },
		
		    toggleRow: function(row, forceOpen)
		    {
		        var opened = hasClass(row, "opened");
		        if (opened && forceOpen)
		            return;
		
		        toggleClass(row, "opened");
		
		        if (hasClass(row, "opened"))
		        {
		            var message = row.repObject;
		            if (!message && row.wrappedJSObject)
		                message = row.wrappedJSObject.repObject;
		
		            var bodyRow = this.bodyRow.insertRows({}, row)[0];
		            var messageInfo = this.bodyTag.replace({message: message}, bodyRow.firstChild);
		            message.bodyRow = bodyRow;
		
		            this.selectTabByName(messageInfo, "Stack");
		        }
		        else
		        {
		            row.parentNode.removeChild(row.nextSibling);
		        }
		    },

		    
		    selectTabByName: function(messageInfoBody, tabName)
		    {
		        var tab = getChildByClass(messageInfoBody, "messageInfoTabs",
		            "messageInfo" + tabName + "Tab");
		        if (tab)
		            this.selectTab(tab);
		    },
		
		    onClickTab: function(event)
		    {
		        this.selectTab(event.currentTarget);
		    },
		
		    selectTab: function(tab)
		    {
		        var messageInfoBody = tab.parentNode.parentNode;
		
		        var view = tab.getAttribute("view");
		        if (messageInfoBody.selectedTab)
		        {
		            messageInfoBody.selectedTab.removeAttribute("selected");
		            messageInfoBody.selectedText.removeAttribute("selected");
		        }
		
		        var textBodyName = "messageInfo" + view + "Text";
		
		        messageInfoBody.selectedTab = tab;
		        messageInfoBody.selectedText = getChildByClass(messageInfoBody, textBodyName);
		
		        messageInfoBody.selectedTab.setAttribute("selected", "true");
		        messageInfoBody.selectedText.setAttribute("selected", "true");
		
		        var message = Firebug.getRepObject(messageInfoBody);
		
		        // Make sure the original Domplate is *not* tracing for now.
		        var dumpDOM = FBTrace.DBG_DOM;
		        FBTrace.DBG_DOM = false;
		        this.updateInfo(messageInfoBody, view, message);
		        FBTrace.DBG_DOM = dumpDOM;
		    },
		
		    updateInfo: function(messageInfoBody, view, message)
		    {
		        var tab = messageInfoBody.selectedTab;
		        if (hasClass(tab, "messageInfoStackTab"))
		        {
		            // The content is generated by domplate template.
		        }
		    },
		    
		    dump: function(message, parentNode, index)
		    {
	            try
	            {
			        var panelNode = parentNode.parentNode.parentNode;
			        var scrolledToBottom = isScrolledToBottom(panelNode);
			
			        // Set message index
			        if (index)
			            message.index = index;
			        else
			            message.index = parentNode.childNodes.length;
			
			        // Insert log into the console.
			        var row = this.rowTag.insertRows({message: message},
			            parentNode, this)[0];
			
			        message.row = row;
			
			        // Only if the manifest uses useNativeWrappers=no.
			        // The row in embedded frame, which uses type="content-primary", from some
			        // reason, this conten type changes wrapper around the row, so let's set
			        // directly thte wrappedJSObject here, so row-expand works.
			        if (row.wrappedJSObject)
			            row.wrappedJSObject.repObject = message;
			
			        if (scrolledToBottom)
			            scrollToBottom(panelNode);	            	
	            }
	            catch (e)
	            {
	                window.dump("ERROR: Firebug.FireInsightModule.AttributeTableTemplate.dump : " + e + "\n");
	            }
		    }		    
		});

		//***********************************************************************************
		// Template representation for the attributes table within the Fire Insight Panel 
		// (domplate)
		//***********************************************************************************
		Firebug.FireInsightModule.EventHandlerTableTemplate = domplate(Firebug.Rep,
		{
			/* Below field stores reference to Firebug.FireInsightModule.PanelTemplate */
			parentPanelTemplate: null,

			/* Below field stores reference to the entire FireInsightPanel object, this 
			 * is needed to switch tabs from within this domplate and also invoke certain 
			 * functions to load the mxGraph display (for the DMG)  
			 */
			fireInsightPanel: null,
			
		    inspectable: false,

		    tableTag:
		        TABLE({class: "messageTable", cellpadding: 0, cellspacing: 0},
		            TBODY()
		        ),
		
		    rowTag:
		        TR({class: "messageRow $message|getMessageType",
		            _repObject: "$message",
		            $exception: "$message|isException",
		            ondblclick: "$onDblClickRow",
		            onclick: "$onClickRow"},
		            TD({class: "messageNameCol messageCol"},
		                DIV({class: "messageNameLabel messageLabel"},
		                    "$message|getMessageIndex")
		            ),
		            TD({class: "messageCol"},
		                DIV({class: "messageLabel", title: "$message|getMessageTitle"},
		                    "$message|getMessageLabel")
		            )
		        ),
		
		    separatorTag:
		        TR({class: "messageRow separatorRow", _repObject: "$message"},
		            TD({class: "messageCol", colspan: "2"},
		                DIV("$message|getMessageIndex")
		            )
		        ),
		
		    bodyRow:
		        TR({class: "messageInfoRow"},
		            TD({class: "messageInfoCol", colspan: 8})
		        ),
		
		    bodyTag:
		        DIV({class: "messageInfoBody", _repObject: "$message"},
		            DIV({class: "messageInfoTabs"},
		                A({class: "messageInfoStackTab messageInfoTab", onclick: "$onClickTab",
		                    view: "Stack"},
		                    $STR("tracing.tab.Stack")
		                )
		            ),
		            DIV({class: "messageInfoStackText messageInfoText"},
		                TABLE({class: "messageInfoStackTable", cellpadding: 0, cellspacing: 0},
		                    TBODY(
		                        FOR("stack", "$message|stackIterator",
		                            TR(
		                                TD({class: "stackFrame"},
		                                    A({class: "stackFrameLink", onclick: "$onClickStackFrame",
		                                        lineNumber: "$stack.lineNumber", 
		                                        filePath: "$stack.filePath"},
		                                        "$stack.fileName"),
		                                    SPAN("&nbsp;"),
		                                    SPAN("(", "$stack.lineNumber", ")"),
		                                    SPAN("&nbsp;"),
		                                    A({class: "openDebugger", onclick: "$onOpenDebugger",
		                                        lineNumber: "$stack.lineNumber",
		                                        fileName: "$stack.fileName"},
		                                        "[...]")
		                                )
		                            )
		                        )
		                    )
		                )
		            )
		        ),

		    // Data providers
		    getMessageType: function(message)
		    {
		        return message.getType();
		    },

		    getMessageIndex: function(message)
		    {
		        return message.index + 1;
		    },

		    getMessageTitle: function(message)
		    {
		        return message.getLabel(-1);
		    },

		    getMessageLabel: function(message)
		    {
		        var maxLength = Firebug.getPref(Firebug.TraceModule.prefDomain,
		            "trace.maxMessageLength");
		        return message.getLabel(maxLength);
		    },

		    isException: function(message)
		    {
		        return message.getException();
		    },

		    // Stack frame support
		    stackIterator: function(message)
		    {
		        return message.getStackArray();
		    },

		    // Implementation
		    createTable: function(parentNode, parentTemplate, panel)
		    {
		    	this.parentPanelTemplate = parentTemplate;
		    	this.fireInsightPanel = panel;
		        return this.tableTag.replace({}, parentNode, this);
		    },
    
		    // Opens a separate window to show the JS source code
		    onClickStackFrame: function(event)
		    {
		        try 
		        {
			        var winType = "FBTraceConsole-SourceView";
			        var lineNumber = event.target.getAttribute("lineNumber");
			        var filePath = event.target.getAttribute("filePath");

	                /*window.dump("Firebug.FireInsightModule.EventHandlerTableTemplate.onClickStackFrame : event.target.innerHTML=[" + event.target.innerHTML + "]\n");
	                window.dump("Firebug.FireInsightModule.EventHandlerTableTemplate.onClickStackFrame : event.target.innerHTML UNESCAPED=[" + event.target.innerHTML.replace(/&amp;/g, "&") + "]\n");*/
					
			        openDialog("chrome://global/content/viewSource.xul",
			            winType, "all,dialog=no",
			            filePath.replace(/&amp;/g, "&"), null, null, lineNumber, false);
			        
			        //FBTrace.sysout("onClickStackFrame", event);
		        }
	            catch (e)
	            {
	                window.dump("ERROR: Firebug.FireInsightModule.EventHandlerTableTemplate.onClickStackFrame : " + e + "\n");
	                FBTrace.sysout("ERROR: Firebug.FireInsightModule.EventHandlerTableTemplate.onClickStackFrame : " + e, e);
	            }
		    },

		    onOpenDebugger: function(event)
		    {
		        var target = event.target;
		        var lineNumber = target.getAttribute("lineNumber");
		        var fileName = target.getAttribute("fileName");
		
		        if (typeof(ChromeBugOpener) === "undefined")
		            return;
		
		        // Open Chromebug window.
		        var cbWindow = ChromeBugOpener.openNow();
		        FBTrace.sysout("Chromebug window has been opened", cbWindow);
		
		        // xxxHonza: Open Chromebug with the source code file, scrolled automatically
		        // to the specified line number. Currently chrome bug doesn't return the window
		        // from ChromeBugOpener.openNow method. If it would be following code opens
		        // the source code file and scrolls to the given line.
		
		        // Register onLoad listener and open the source file at the specified line.
		        if (cbWindow) {
		            cbWindow.addEventListener("load", function() {
		                var context = cbWindow.FirebugContext;
		                var link = new cbWindow.FBL.SourceLink(fileName, lineNumber, "js");
		                context.chrome.select(link, "script");
		            }, true);
		        }
		    },

			onDblClickRow: function(event) {
		    	//alert('EventHandlerTableTemplate onClickRow -> ' + event.target.innerHTML);
		        if (isLeftClick(event))
		        {
		            /* Unload the current mxGraph and then switch to the DMG tab */
		            this.fireInsightPanel.unloadMxGraph();
		            this.fireInsightPanel.loadMxGraph(event.target.innerHTML);
		            this.parentPanelTemplate.selectTabByName(this.fireInsightPanel.panelNode, "DMG");
		        }
			},
			
		    // Body of the message.
		    onClickRow: function(event)
		    {
		        // Disabled because we don't want to expand a row in the Event Handler log window
		        /* if (isLeftClick(event))
		        {
		            var row = getAncestorByClass(event.target, "messageRow");
		            if (row)
		            {
		                this.toggleRow(row);
		                cancelEvent(event);
		            }
		        }*/
		    },
		
		    toggleRow: function(row, forceOpen)
		    {
		        var opened = hasClass(row, "opened");
		        if (opened && forceOpen)
		            return;
		
		        toggleClass(row, "opened");
		
		        if (hasClass(row, "opened"))
		        {
		            var message = row.repObject;
		            if (!message && row.wrappedJSObject)
		                message = row.wrappedJSObject.repObject;
		
		            var bodyRow = this.bodyRow.insertRows({}, row)[0];
		            var messageInfo = this.bodyTag.replace({message: message}, bodyRow.firstChild);
		            message.bodyRow = bodyRow;
		
		            this.selectTabByName(messageInfo, "Stack");
		        }
		        else
		        {
		            row.parentNode.removeChild(row.nextSibling);
		        }
		    },

		    
		    selectTabByName: function(messageInfoBody, tabName)
		    {
		        var tab = getChildByClass(messageInfoBody, "messageInfoTabs",
		            "messageInfo" + tabName + "Tab");
		        if (tab)
		            this.selectTab(tab);
		    },
		
		    onClickTab: function(event)
		    {
		        this.selectTab(event.currentTarget);
		    },
		
		    selectTab: function(tab)
		    {
		        var messageInfoBody = tab.parentNode.parentNode;
		
		        var view = tab.getAttribute("view");
		        if (messageInfoBody.selectedTab)
		        {
		            messageInfoBody.selectedTab.removeAttribute("selected");
		            messageInfoBody.selectedText.removeAttribute("selected");
		        }
		
		        var textBodyName = "messageInfo" + view + "Text";
		
		        messageInfoBody.selectedTab = tab;
		        messageInfoBody.selectedText = getChildByClass(messageInfoBody, textBodyName);
		
		        messageInfoBody.selectedTab.setAttribute("selected", "true");
		        messageInfoBody.selectedText.setAttribute("selected", "true");
		
		        var message = Firebug.getRepObject(messageInfoBody);
		
		        // Make sure the original Domplate is *not* tracing for now.
		        var dumpDOM = FBTrace.DBG_DOM;
		        FBTrace.DBG_DOM = false;
		        this.updateInfo(messageInfoBody, view, message);
		        FBTrace.DBG_DOM = dumpDOM;
		    },
		
		    updateInfo: function(messageInfoBody, view, message)
		    {
		        var tab = messageInfoBody.selectedTab;
		        if (hasClass(tab, "messageInfoStackTab"))
		        {
		            // The content is generated by domplate template.
		        }
		    },
		    
		    dump: function(message, parentNode, index)
		    {
	            try
	            {
			        var panelNode = parentNode.parentNode.parentNode;
			        var scrolledToBottom = isScrolledToBottom(panelNode);
			
			        // Set message index
			        if (index)
			            message.index = index;
			        else
			            message.index = parentNode.childNodes.length;
			
			        // Insert log into the console.
			        var row = this.rowTag.insertRows({message: message},
			            parentNode, this)[0];
			
			        message.row = row;
			
			        // Only if the manifest uses useNativeWrappers=no.
			        // The row in embedded frame, which uses type="content-primary", from some
			        // reason, this conten type changes wrapper around the row, so let's set
			        // directly thte wrappedJSObject here, so row-expand works.
			        if (row.wrappedJSObject)
			            row.wrappedJSObject.repObject = message;
			
			        if (scrolledToBottom)
			            scrollToBottom(panelNode);	            	
	            }
	            catch (e)
	            {
	                window.dump("ERROR: Firebug.FireInsightModule.EventHandlerTableTemplate.dump : " + e + "\n");
	            }
		    }		    
		});
		
		//***********************************************************************************
		// Data representation for a single trace message within the Fire Insight Panel 
		// (domplate)
		//***********************************************************************************
		Firebug.FireInsightModule.AttributeTraceMessage = function(text, obj, sourceFileArray)
		{
            try
            {
                //FBTrace.sysout("Firebug.FireInsightModule.AttributeTraceMessage : ", sourceFileArray);
				this.sourceFilePaths = sourceFileArray;
			    this.type = "Empty Type";
			    this.text = text;
			    this.obj = obj;
			    this.stack = [];
			    this.scope = "Empty Scope";
			
		        // Initialize stack trace info. This must be done now, when the stack
		        // is available.
		        /*for (var frame = Components.stack, i=0; frame; frame = frame.caller, i++)
		        {
		            // Skip frames related to the tracing code.
		            var fileName = unescape(frame.filename ? frame.filename : "");
		            var traceServiceFile = "firebug@software.joehewitt.com/components/firebug-trace-service.js";
		            if (i < 6 || fileName.indexOf(traceServiceFile) != -1)
		                continue;
		
		            var sourceLine = frame.sourceLine ? frame.sourceLine : "";
		            var lineNumber = frame.lineNumber ? frame.lineNumber : "";
		            this.stack.push({fileName:fileName, lineNumber:lineNumber});
		        }*/
		
				// First line of stack trace is separated using ":"
	        	var stackTraceArray = obj.split("::");
	        	
	        	if (stackTraceArray && stackTraceArray.length > 0)
	        		this.stack.push(this.getFormatedObject(stackTraceArray[0]));

				// Check to see if more lines of stack trace exist. All subsequent 
				// lines of stack trace is separated using ","
	        	if (stackTraceArray && stackTraceArray.length > 1)
	        	{
		        	var innerStackTraceArray = stackTraceArray[1].split(",");
		        	var numInvocations = innerStackTraceArray.length;
		        	for (var j=numInvocations - 1 ; j >= 0; j--)
		        	{
		            	this.stack.push(this.getFormatedObject(innerStackTraceArray[j]));
		        	}
	        	}
	        	//FBTrace.sysout("TraceMessage Stack: ", this.stack);
            }
            catch (e)
            {
                window.dump("ERROR: Firebug.FireInsightModule.AttributeTraceMessage : " + e + "\n");
                FBTrace.sysout("ERROR: Firebug.FireInsightModule.AttributeTraceMessage : " + e, e);
            }
			//FBTrace.sysout("Firebug.FireInsightModule.AttributeTraceMessage STACK", this.stack);
		}

		Firebug.FireInsightModule.AttributeTraceMessage.prototype =
		{
		    getType: function()
		    {
		        return this.type;
		    },
		
		    getLabel: function(maxLength)
		    {
		    	if (!maxLength)
		    		maxLength = 100;
		    	
		        if (maxLength <= 10 || this.text.length <= maxLength)
		            return this.text.replace(/[\n]/g,"");
		
		        return this.text.substr(0, maxLength - 3) + "...";
		    },

		    getStackArray: function()
		    {
		        return this.stack;
		    },
		    		
		    getException: function()
		    {
		        if (this.err)
		            return this.err;
		
		        this.err = "Empty Exception";
				
		        return this.err;
		    },
		    
		    getFormatedObject: function(strValue)
		    {
		    	window.dump(strValue);
	            var fileName = "";
	            var lineNumber = "";

		    	if (strValue && typeof strValue === "string")
		    	{
		            if (strValue.indexOf('@') >= 0)
		            {
		            	var tokens = strValue.split("@");
		            	lineNumber = tokens[0].replace(/\?/g, "");
		            	fileName = tokens[1];
		            }
		            else if (strValue.indexOf('&') >= 0)
		            {
		            	var tokens = strValue.split("&");
		            	fileName = tokens[0];		            	
		            	lineNumber = tokens[1].replace(/\?/g, "");
		            }
		            else
		            {
			    		fileName = "Error: Could not format";
			    		lineNumber = "Error: Could not format";
		            }
		    	}
		    	else
		    	{
		    		fileName = "Error: Could not format";
		    		lineNumber = "Error: Could not format";
		    	}	

				var filePath = this.findCorrectFilePath(fileName);

		    	return {fileName:fileName, filePath:filePath, lineNumber:lineNumber};
		    },
		    
		    findCorrectFilePath: function(fileName)
		    {
		    	try 
		    	{
			    	var fileArray = this.sourceFilePaths;
			    	var numFiles = fileArray.length;
			    	
			    	for (var i=0 ; i < numFiles ; i++)
			    	{
			    		//FBTrace.sysout("findCorrectFilePath: fileName = [" +fileName+ "] fileArray[i]=" + fileArray[i]);
			    		//var tokens = fileArray[i].path.split("\\");
			    		//if (tokens[tokens.length - 1] === fileName)
			    		if (fileArray[i].uri && fileArray[i].uri === fileName)
			    		{
				    		//FBTrace.sysout("findCorrectFilePath: FILE FOUND = [" +fileArray[i]+ "]");		    			
			    			return fileArray[i].path;
			    		}
			    	}
		    	}
	            catch (e)
	            {
	                window.dump("ERROR: Firebug.FireInsightModule.AttributeTraceMessage : " + e + "\n");
	                FBTrace.sysout("ERROR: Firebug.FireInsightModule.AttributeTraceMessage : " + e, e);
	            }
		    			    	
		    	return null;
		    }
		}
				
		/*----------------------------------------------------------------------------- 
		 * Registration
		 *-----------------------------------------------------------------------------*/
		Firebug.registerModule(Firebug.FireInsightModule); 
		Firebug.registerPanel(FireInsightPanel); 
	}
});