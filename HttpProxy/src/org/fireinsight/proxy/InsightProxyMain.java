package org.fireinsight.proxy;

import java.util.Vector;

import org.apache.log4j.Logger;
import org.fireinsight.util.Props;

/**
 * Driver class that runs the Script Insight application.
 * 
 * @author Steven Gao
 * 
 */
public class InsightProxyMain
{
	/* Log4j Logger */
	static Logger logger = Logger.getLogger(InsightProxyMain.class.getName());

    /* Name for properties entry specifying port number that Insight Proxy
     * should listen at for HTTP requests
     */
	private static final String PORT_NUMBER_PROP = "ProxyServerPort";

    /* Name for properties entry specifying the number of threads to use for
     * handling HTTP requests
     */
	private static final String TASK_POOL_SIZE_PROP = "TaskPoolSize";
	
    /* Name for properties entry specifying list containing URIs for 
     * JavaScript files to explicitly ignore when performing instrumentation
     */
    private static final String IGNORE_LIST_PROP = "IgnoreList";

    /* Vector containing String listing of URIs for JavaScript files to ignore
     * during instrumentation
     */
    public static final Vector<String> IGNORE_LIST = buildIgnoreList();

	/*
	 * Ensure that port number chosen is within accepted range for dynamic port
	 * numbers: http://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers
	 */
	private static final int LOWER_BOUND = 1024;
	private static final int UPPER_BOUND = 65535;

	/**
	 * Driver method to start Insight Proxy application.
	 * @param argv
	 */
	public static void main(String argv[])
	{
		try
		{
			int port = Integer.parseInt(Props.getProperty(PORT_NUMBER_PROP));
            int nTasks = Integer.parseInt(Props.getProperty(TASK_POOL_SIZE_PROP));

			/* TODO: Find better way to handle exceptions */
			if (port > UPPER_BOUND || port < LOWER_BOUND)
			{
				throw new NumberFormatException("Port number out-of-bounds");
			}
			
			/* TODO: Does RequestListenerThread really need to be a thread? */
	        Thread t = new RequestListenerThread(port, nTasks);
	        t.setDaemon(false);
            logger.info(" -------------- Script Insight Proxy -------------- ");
	        t.start();
		} 
		catch (Exception e)
		{
			if (e instanceof NumberFormatException)
			{
				logger.error("Invalid port number, set " + PORT_NUMBER_PROP + " in "
						+ Props.getDefaultPath() + " to a valid integer "
						+ " value between [" + LOWER_BOUND + ", " + UPPER_BOUND
						+ "]" + "inclusive.");
			}
			System.exit(-1);
		}
	}
	
	/**
     * Build listing of JavaScript files to ignore during instrumentation.
     * 
     * @return Vector<String> listing of string URIs for JavaScript files to
     *         ignore.
     */
	private static Vector<String> buildIgnoreList() {
	    Vector<String> listing = new Vector<String>();
	    String[] values = Props.getProperty(IGNORE_LIST_PROP).split(",");
	    
	    for (String value : values) {
	        listing.add(value);
	    }
	    
	    return listing;
	}
}
