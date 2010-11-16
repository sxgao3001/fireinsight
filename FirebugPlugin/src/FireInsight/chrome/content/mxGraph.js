alert("Loading mxGraph.js");
/* Program starts here. Creates a graph in the DOM node with the specified ID. 
 * This function is invoked from the onClick event handler of the document body. 
 */
function main(container, array)
{
	/* Checks if the browser is supported */
	if (!mxClient.isBrowserSupported())
	{
		/* Displays an error message if the browser is not supported. */
		mxUtils.error('Browser is not supported!', 200, false);
	}
	else
	{
		/* Ensure that array has been passed into main() */
		if (array !== undefined && array !== null) 
		{
			/* Ensure that array contains some stack trace elements, otherwise 
			 * there is nothing to display 
			 */
			if (array.length > 0) 
			{
				/* Ensure that the mxGraph has not already been created (in case 
				 * the user toggles between this tab (i.e. DMG) and the Logs tab. 
				 */
				if (container.hasBeenCreated === null 
					|| container.hasBeenCreated === undefined 
					|| container.hasBeenCreated === false) 
				{
                	//alert("Create MxGraph first time");
                	//alert("ParentNode=[" + container.parentNode + "] ParentNode.firstChild=[" + container.parentNode.firstChild + "]");
					
					/* First time here, so set the flag to indicate that mxGraph 
					 * has now been created 
					 */
					container.hasBeenCreated = true;

					/* Only display the grid background if there is a graph to 
					 * construct 
					 */
					container.style.background = "url(chrome://insight/content/images/grid.gif)";
					
					// Creates the graph inside the given container
					// Optionally you can enable panning, tooltips and connections
					// using graph.setPanning(), setTooltips() & setConnectable().
					// To enable rubberband selection and basic keyboard events,
					// use new mxRubberband(graph) and new mxKeyHandler(graph).
					var graph = new mxGraph(container);
	
					// Changes the default vertex style in-place
					var style = graph.getStylesheet().getDefaultVertexStyle();
					style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_ELLIPSE;
					style[mxConstants.STYLE_PERIMETER] = mxPerimeter.EllipsePerimeter;
					style[mxConstants.STYLE_GRADIENTCOLOR] = 'white';
					style[mxConstants.STYLE_FONTSIZE] = '10';
				
					// Enables tooltips, new connections and panning
					graph.setPanning(true);
					//graph.setTooltips(true);
					graph.setConnectable(false);
					graph.setCellsEditable(false);
						
					// Uncomment the following if you want the container
					// to fit the size of the graph
					graph.setResizeContainer(true);
	
					// Larger grid size yields cleaner layout result
					graph.gridSize = 80;
					
					// Enables rubberband (marquee) selection and a handler
					// for basic keystrokes (eg. return, escape during editing).
					var rubberband = new mxRubberband(graph);
					var keyHandler = new mxKeyHandler(graph);
		
					// Installs a custom tooltip for cells
					graph.getTooltipForCell = function(cell)
					{
						return 'Right-click node to see its stack trace';
					};
						
					// Installs a popupmenu handler using local function (see below).
					graph.panningHandler.factoryMethod = function(menu, cell, evt)
					{
						return createPopupMenu(graph, menu, cell, evt);
					};
	
					// Overrides method to create the editing value
					graph.convertValueToString = function(cell)
					{
						if (cell.value !== null && cell.value !== undefined && cell.value !== '' )
						{
							if (typeof cell.value === 'string' || typeof cell.value === 'number') {
								return cell.value;
							}
							return cell.value.contextName;
						}
					};
	
					// Gets the default parent for inserting new cells. This
					// is normally the first child of the root (ie. layer 0).
					var parent = graph.getDefaultParent();
	
					// Creates a layout algorithm to be used
					// with the graph
					var layout = new mxFastOrganicLayout(graph);
					
					// Moves stuff wider apart than usual
					layout.forceConstant = 80;
			
					// Adds a button to execute the layout
					container.parentNode.insertBefore(mxUtils.button('Circle Layout',
						function(evt)
						{
							// Creates a layout algorithm to be used
							// with the graph
							var circleLayout = new mxCircleLayout(graph);
							circleLayout.execute(parent);
						}
					), container);
													
					// Adds a button to execute the layout
					container.parentNode.insertBefore(mxUtils.button('Organic Layout',
						function(evt)
						{
							layout.execute(parent);
						}
					), container);
			
					/* Adds cells to the model in a single step */ 
					graph.getModel().beginUpdate();
					try
					{
						// TODO: Remove this debugging line later
						alert("mxGraph # of nodes created: [" + array.length + "]\n");

						/* Refers to the previous node in the array; used to create edges 
						 * between nodes to indicate chronological order. 
						 */
						var previousNode = graph.insertVertex(parent, null, {}, 0, 0, 60, 30);;
						
						/* Records all the unique stack traces that have already been 
						 * added as nodes to the graph. We want to ensure that a given 
						 * stack trace only appears once on the graph. All subsequent 
						 * occurences of a stack trace will use the already existing node
						 * on the graph. Stack traces are inserted into this object indexed
						 * by their stack trace id (which is just a string representation 
						 * of the entire stack trace).
						 */
						var currentNodeList = {};
						
						window.dump('\nBuilding graph ');
						for (var i=0; i<array.length; i++) {
							var traceContext = array[i];
							var stackTrace = traceContext.contextStack;
														
							/* Insert a vertex into the graph arguments are as follows: 
							 * 		parent, id, value, x, y, width, height, style
							 * 
							 * value = object that will be accessible from cell.value 
							 *         from within pop up menu function (see below)  
							 */
							var currentNode = null; 
							// If this stack trace node exists already, the just reference that existing node
							if (currentNodeList[traceContext.contextId]) {
								currentNode = currentNodeList[traceContext.contextId];
							}
							// Else, it does not exist yet, so add to graph and record it
							else {
								currentNode = graph.insertVertex(parent, null, traceContext, 0, 0, 60, 30);
								currentNodeList[traceContext.contextId] = currentNode;

								/* Loop through all JS files in the current stack trace and add the file paths
								 * as new properties to the current array element. This will be needed for 
								 * when we create the popup menu (i.e. createPopupMenu() below), so that users
								 * can right-click on nodes and view source on any of the functions in the stack 
								 * trace 
								 */
								for (var j=0; j<stackTrace.length; j++) {
									traceContext[stackTrace[j].fileName] = stackTrace[j].filePath;
		
									// TODO: Remove this debugging line later
									//alert("traceContext[" + stackTrace[j].fileName + "]=" + traceContext[stackTrace[j].fileName]);
								}
							}
							
							/* If previous node is not empty, then create an edge between it and the current node
							 * 
							 * Insert an edge into the graph arguments are as follows: 
							 * 		parent, id, value, source, target, style
							 * 
							 * value = object that will be accessible from cell.value 
							 *         from within pop up menu function (see below)  
							 */
							//if (previousNode) {
								graph.insertEdge(parent, null, null, previousNode, currentNode);
							//}
							
							previousNode = currentNode;
							//window.dump('.');
						}
						//window.dump('\n');

						// TODO: Remove the below lines later
						/*var v1 = graph.insertVertex(parent, null, 'A', 0, 0, 30, 30);
						var v2 = graph.insertVertex(parent, null, 'B', 0, 0, 30, 30);
						var v3 = graph.insertVertex(parent, null, 'C', 0, 0, 30, 30);
						var v4 = graph.insertVertex(parent, null, 'D', 0, 0, 30, 30);
						var v5 = graph.insertVertex(parent, null, 'E', 0, 0, 30, 30);
						var v6 = graph.insertVertex(parent, null, 'F', 0, 0, 30, 30);
						var v7 = graph.insertVertex(parent, null, 'G', 0, 0, 30, 30);
						var v8 = graph.insertVertex(parent, null, 'H', 0, 0, 30, 30);
						var e1 = graph.insertEdge(parent, null, 'ab', v1, v2);
						var e2 = graph.insertEdge(parent, null, 'ac', v1, v3);
						var e3 = graph.insertEdge(parent, null, 'cd', v3, v4);
						var e4 = graph.insertEdge(parent, null, 'be', v2, v5);
						var e5 = graph.insertEdge(parent, null, 'cf', v3, v6);
						var e6 = graph.insertEdge(parent, null, 'ag', v1, v7);
						var e7 = graph.insertEdge(parent, null, 'gh', v7, v8);
						var e8 = graph.insertEdge(parent, null, 'gc', v7, v3);
						var e9 = graph.insertEdge(parent, null, 'gd', v7, v4);
						var e10 = graph.insertEdge(parent, null, 'eh', v5, v8); */
		
						// Executes the layout
						layout.execute(parent);
					}
					finally
					{
						// Updates the display
						graph.getModel().endUpdate();
					}
					
					// Animates the changes in the graph model
					graph.getModel().addListener(mxEvent.CHANGE, function(sender, evt)
					{
						var changes = evt.getArgAt(0);
						//var animate = document.getElementById('animate');
			
						//if (animate.checked)
						//{
							//mxUtils.animateChanges(graph, changes);
						//}
					});
				}
				else {
                	alert("MxGraph already exists, do not create again");					
				}
			}
		}
		else {
			// Write something to div container to show message 
			// container.innerHTML = "This element is not animated and does not have a DMG graph.";
		}
	}
};

/* Function to create the entries in the popupmenu */
function createPopupMenu(graph, menu, cell, evt)
{
	if (cell !== null)
	{
		if (cell.value !== null && cell.value !== undefined) {
			var stackTrace = cell.value.contextStack;

			// TODO: Remove the below debugging line later
			window.dump("-------------- Pop up menu inspect elements -------------- \n");
			for (p in cell.value) {
				window.dump(p + "=[" + cell.value[p] + "]\n");
			}

			if (stackTrace !== null && stackTrace !== undefined) {
				for (var i=0; i<stackTrace.length; i++) {
					menu.addItem(stackTrace[i].fileName + " (" + stackTrace[i].lineNumber + ")", 'editors/images/image.gif', /*createStackTraceMenu(stackTrace[i]));*/ 
					function(eventValue)
					{
						//mxUtils.alert('MenuItem1');
			    		var tokens = eventValue["originalTarget"]["innerHTML"].split(" ");
			    		if (tokens !== null && tokens !== undefined && tokens.length >= 2) {
			    			var fileNameValue = tokens[0];
			    			var fileLineNumber = tokens[1].replace(/\(/g, "").replace(/\)/g, "");
							//mxUtils.alert("selection: [" + fileNameValue + "]=[" + cell.value[fileNameValue] + "] lineNumber=[" + fileLineNumber + "]");
							window.openDialog("chrome://global/content/viewSource.xul", "_blank",
							        "all,dialog=no", cell.value[fileNameValue], null, null, fileLineNumber);
			    		}
			    		else {
							mxUtils.alert("No JS file was found.");			    			
			    		}
					});
				}
			}
		}
	}
	else
	{
		menu.addItem('No-Cell Item', '', function()
		{
			mxUtils.alert('MenuItem2');
		});
	}
	/*menu.addSeparator();
	menu.addItem('MenuItem3', 'http://www.mxgraph.com/demo/mxgraph/src/images/warning.gif', function()
	{
		mxUtils.alert('MenuItem3: '+graph.getSelectionCount()+' selected');
	});*/
};
