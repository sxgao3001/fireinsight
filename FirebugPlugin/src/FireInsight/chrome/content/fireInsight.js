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
		const Cc = Components.classes;
		const Ci = Components.interfaces;

        const nsIPrefBranch = Ci.nsIPrefBranch;
        const nsIPrefBranch2 = Ci.nsIPrefBranch2;

        const insightPrefService = Cc["@mozilla.org/preferences-service;1"];
        const insightPrefs = insightPrefService.getService(nsIPrefBranch2);

        //const rainbowWebsite = "http://xrefresh.com/rainbow"
        //const rainbowPrefDomain = "extensions.rainbow";
        
        //const currentCodeVersion = 2;

		var insightSourcePathDelimiter = ":";
		
        if (Firebug.TraceModule)
        {
          Firebug.TraceModule.DBG_FIREINSIGHT = false;
          var type = insightPrefs.getPrefType('extensions.firebug.DBG_FIREINSIGHT');
          if (type!=nsIPrefBranch.PREF_BOOL) 
          {
	          try 
	          {
	          	insightPrefs.setBoolPref('extensions.firebug.DBG_FIREINSIGHT', false);
	          } 
	          catch(e) {}
          } 
        }
		
		// Get tracing object for our "extensions.fireinsight" domain.
		//var FBTrace = Cc["@joehewitt.com/firebug-trace-service;1"].getService(Ci.nsISupports)
		  //  .wrappedJSObject.getTracer("extensions.fireinsight");
	
		/*----------------------------------------------------------------------------- 
		 * FireInsight Module
		 *-----------------------------------------------------------------------------*/
		Firebug.FireInsightModule = extend(Firebug.Module, 
		{
			// FireInsight extension version number
			version: '1.0',

			//firebug dependency, which is checked when opening panels
			//and routes to an unsupported/upgrade firebug message if necessary
			'firebugVersion': '1.4',

			//the identifying names of our panels
			panelNames: {
				'fireInsight' : 'fireInsight',
				},
			
			valid: false,
			
		    /*************************************************************************** 
		     * Method: Taken from Rainbow code
		     ***************************************************************************/
            checkFirebugVersion: function()
            {
                var version = Firebug.getVersion();
                if (!version) return false;
                var a = version.split('.');
                if (a.length<2) return false;
                // we want Firebug version 1.2+ (including alphas/betas and other weird stuff)
                return parseInt(a[0], 10)>=1 && parseInt(a[1], 10)>=2;
            },
		    
		    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
		    // extends Panel

		    /*************************************************************************** 
		     * [extends]
		     * Method: Invoked when firefox starts / the page changes
		     ***************************************************************************/
		    initContext: function(context)
		    {
                if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
                	FBTrace.sysout("FireInsightModule: initContext", context);
                Firebug.Module.initContext.apply(this, arguments);
                // check firebug version
                if (!this.checkFirebugVersion())
                {
                    if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
                    	FBTrace.sysout("FireInsight requires Firebug 1.2+ (your version is "+Firebug.getVersion()+")");
                    return;
                }
                this.valid = true;
		    },
		    /*************************************************************************** 
		     * [extends]
		     * Method: Initialize this module, invoked as Firefix starts up
		     ***************************************************************************/
		    initialize: function()
		    {
		        // Add listener for log customization
				if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
                	FBTrace.sysout("FireInsightModule: initialize");
		
                return Firebug.Module.initialize.apply(this, arguments);
		    },
		    /*************************************************************************** 
		     * [extends]
		     * Method: Invoked when a main panel is opened
		     ***************************************************************************/
			showPanel: function(browser, panel) 
		    { 
                if (!this.valid)  
                	return;
		        var isFireInsight = panel && panel.name == "html"; 
                
                // this is a way how to get notified when new source is (possibly) available for coloring
                if (isFireInsight)
                {
	                if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
	                	FBTrace.sysout("FireInsightModule: showPanel", panel);
                }                
		    }, 	
		    /*************************************************************************** 
		     * [extends]
		     * Method: Invoked when a side panel is opened
		     ***************************************************************************/
			showSidePanel: function(browser, panel) 
		    { 
                if (!this.valid)  
                	return;
		        var isFireInsight = panel && panel.name == "fireInsight"; 

                // this is a way how to get notified when new source is
                // (possibly) available for coloring
                if (isFireInsight)
                {
	                if (FBTrace && FBTrace.DBG_FIREINSIGHT) 
	                	FBTrace.sysout("FireInsightModule: showSidePanel", panel);
                }                
		    }, 	
		    /*************************************************************************** 
		     * Method: 
		     ***************************************************************************/
		    shutdown: function() 
		    {
		        Firebug.Module.shutdown.apply(this, arguments);		        
		    },
		    /*************************************************************************** 
		     * Method: Called when console window is loaded
		     ***************************************************************************/
		    onLoadConsole: function(win, rootNode)
		    {
		    },
		    /*************************************************************************** 
		     * Method: Called when a new message is logged in to the trace-console window
		     ***************************************************************************/
		    onDump: function(message)
		    {
		    },
		}); 
	}
});