								/* Read entire JS source into string "data" */
								var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
								var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
								fstream.init(file, -1, 0, 0);
								sstream.init(fstream); 
								
								var data = "";
								var str = sstream.read(4096);
								while (str.length > 0) {
								  data += str;
								  //window.dump(str);
								  str = sstream.read(4096);
								}
								
								sstream.close();
								fstream.close();
								//window.dump("Data: [" + data + "]\n");

								/* Iterate through JS source code for the current JS file and remove all instrumented code */
								var startIndex = -1;
								var endIndex = -1;
								var counter = 1;
								var codeFragments = data.split(insightBreakLineRegExp);			/*** Computationally Expensive TODO: Find better solution ***/
								var tokens = [];
								var j = 0;
								
								window.dump("# of code fragments: [" + codeFragments.length + "]\n");
								
								if (codeFragments) {
									for (j=0; j<codeFragments.length; j++ ) {
										// Skip all instrumented code lines and keep only original lines of source code
										if (codeFragments[j] && codeFragments[j].length > 0 && codeFragments[j].search(insightLineMarkerRegExp) == -1) {
											tokens.push(codeFragments[j]);
										}
										else {
											//window.dump("Code Fragment [" +j+ "]: " + codeFragments[j]);
										}
									}
								}
																
								window.dump("Tokens: [" + tokens + "]\n");
								
								data = "";
								
								for (j=0; j<tokens.length; j++) {
									data = data + tokens[j] + "\n";
								}
								
								//window.dump("Data: [" +data+ "]\n");
								
								this.writeFile(data, file);
