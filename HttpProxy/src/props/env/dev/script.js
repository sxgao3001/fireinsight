/* Current stack on JavaScript runtime (temporary) */
if (document._stack === undefined || document._stack === null) {
	document._stack = new Array();
}

/* Global stack, retain history of trace information */
if (document._globalStack === undefined || document._globalStack === null) {
	document._globalStack = {};
}

/* Global stack, listing of all anonymous functions 
 * identified by filename and line number of function 
 * declaration 
 */
if (document._topLevelHandler === undefined || document._topLevelHandler === null) {
	document._topLevelHandler = new Array();
}

document.pushStackTraceInfo = function(traceStr) {
	document._stack.push(traceStr);
	/* window.dump(document._stack.toString() + '\n'); */
};

document.popStackTraceInfo = function() {
	document._stack.pop();
	/* window.dump(document._stack.toString() + '\n'); */
}; 

/* Function to record the filename and line number of the currently executing top level 
 * event handler function within the original JavaScript source code.  
 */
document.pushFunctionInfo = function(functionName, fileName, startLineNumber) {
	/* Only alter _topLevelHandler if _stack is empty, meaning the current function 
	 * is a top level function 
	 */
	/* if (document._stack instanceof Array && document._stack.length == 0) { */
		/*if (fileName === 'dojo.js' && startLineNumber === 3876) {
			window.dump('\t\tBEFORE\tdocument._topLevelHandler=[' + document._topLevelHandler + ']\n');
		}
		if (document._topLevelHandler === 'dojo.js:3876') {
			window.dump('\t\tAFTER\tdocument._topLevelHandler=[' + fileName + ':' + startLineNumber + ']\n');
		}*/
		document._topLevelHandler.push(functionName + '::' + fileName + '::' + startLineNumber);
		/* window.dump('PUSH   ' + document._topLevelHandler.toString() + '\n'); */
	/*}*/
};

document.popFunctionInfo = function() {
	document._topLevelHandler.pop();
	/* window.dump('POP    ' + document._topLevelHandler.toString() + '\n'); */
};

/* Function to monitor when DOM elements are created */
document.createElement0 = function(str) {  
	var parts = str.split(','); 
	var element = document.createElement(parts[0]); 
	element.appendChild0 = function(obj,line) { 
		this.appendChild(obj); 
		this._appendChild = line; 
	}; 

	/* 1. Add stack trace information for this particular element */
	/* element.____locator = parts[1] + '::' + document._stack.toString(); */
	element.____locator = document._stack.toString();

    var stackTrace = [];

    try {(0)()} catch (e) {
	    stackTrace = e.stack.replace(/^.*?\n/,'').
	       replace(/(?:\n@:0)?\s+$/m,'').
	       replace(/^\(/gm,'{anonymous}(').
	       split("\n");
    }
	var eventHandlerName = document._topLevelHandler[0];

	if (false /* eventHandlerName === "{anonymous}catalog.js:16" eventHandlerName.indexOf('anonymous') !== -1 */) {
		window.dump('\n*********************** createElement0 = ' + str + ' where parts[0]=' + parts[0] + " and parts[1]=" + parts[1] + ' ***********************\n');
		
		/*
		var stackTraceStr = '';
		
		for (var k=0; k<stackTrace.length; k++) {
			stackTraceStr += stackTrace[k] + '\n';
		}
		
		window.dump(stackTraceStr);
		window.dump("Event Handler = " + eventHandlerName + "\n");
		window.dump("Alternate Stack = " + (new Error()).stack + "\n");
		*/
		window.dump(document._topLevelHandler.toString() + "\n");
		window.dump('********************************************************************************************\n');
	}
	
	/* 2. Record the name of the current event handler that was responsible for the creation of this element */
	if (!(element.____eventHandlers instanceof Array)) {
		element.____eventHandlers = new Array();
	}
	if (eventHandlerName !== null && eventHandlerName !== undefined) {
		if (element.____eventHandlers.indexOf(eventHandlerName) === -1) {
			element.____eventHandlers.push(eventHandlerName);
		}
		/* 3. Add stack trace information to the corresponding event handler */
		if (!(document._globalStack[eventHandlerName] instanceof Array)) {
			document._globalStack[eventHandlerName] = new Array();
		}
		document._globalStack[eventHandlerName].push('____' + parts[0] + '::' + parts[1] + '::' + document._stack.toString());
	}
	else {
		alert('eventHandlerName=' + eventHandlerName + '\nStack Trace was: ' + stackTrace.toString());
	}
	
	return element; 
};

/* Function to monitor changes to DOM elements */ 
document.appendInfo0 = function(obj, prop, info) { 
	if(obj.tagName === undefined) {
		return; 
	} 
	if(obj.____locator === undefined) { 
		obj.____locator = '?' + info; 
	} 
	if(obj[prop] === undefined) { 
		obj[prop] = new Array(); 
	} 
	
    var stackTrace = [];

	/* Create a stack trace in order to get the name of the function on the top of the execution stack */
    try {(0)()} catch (e) {
	    stackTrace = e.stack.replace(/^.*?\n/,'').
	       replace(/(?:\n@:0)?\s+$/m,'').
	       replace(/^\(/gm,'{anonymous}(').
	       split("\n");
    }
	var eventHandlerName = document._topLevelHandler[0];

	/* 1. Record the name of the current event handler that was responsible for the creation of this element */
	if (!(obj.____eventHandlers instanceof Array)) {
		obj.____eventHandlers = new Array();
	}
	if (eventHandlerName !== null && eventHandlerName !== undefined) {
		if (obj.____eventHandlers.indexOf(eventHandlerName) === -1) {
			obj.____eventHandlers.push(eventHandlerName);
		}

		/* 2. Add stack trace information to the corresponding event handler */
		if (!(document._globalStack[eventHandlerName] instanceof Array)) {
			document._globalStack[eventHandlerName] = new Array();
		}
		document._globalStack[eventHandlerName].push(prop + '::' + info + '::' + document._stack.toString());
	}
	else {
		alert('eventHandlerName=' + eventHandlerName + '\nStack Trace was: ' + stackTrace.toString());
	}

	if (false /* eventHandlerName === "{anonymous}catalog.js:16"  eventHandlerName.indexOf('anonymous') !== -1 */) {
		/*
		var stackTraceStr = '';
		
		for (var k=0; k<stackTrace.length; k++) {
			stackTraceStr += stackTrace[k] + '\n';
		}
		*/
		window.dump('\n******************* appendInfo0 **********************************************************\n');
		/*
		window.dump(obj + '[' + prop + ']:' + info + ':' + document._stack.toString() + '\n');
		window.dump(stackTraceStr);
		window.dump("Event Handler = " + eventHandlerName + "\n");
		window.dump("Alternate Stack = " + (new Error()).stack + "\n");
		*/
		window.dump(document._topLevelHandler.toString() + "\n");
		window.dump('********************************************************************************************\n');
	}
	
	/* 3. Add stack trace information for this particular element */
	obj[prop].push(info + '::' + document._stack.toString());
};