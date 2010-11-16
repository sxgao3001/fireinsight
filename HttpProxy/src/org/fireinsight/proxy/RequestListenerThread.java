package org.fireinsight.proxy;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.apache.http.impl.DefaultHttpClientConnection;
import org.apache.http.impl.DefaultHttpResponseFactory;
import org.apache.http.impl.DefaultHttpServerConnection;
import org.apache.http.impl.NoConnectionReuseStrategy;
import org.apache.http.protocol.BasicHttpProcessor;
import org.apache.http.protocol.HttpRequestExecutor;
import org.apache.http.protocol.HttpRequestHandlerRegistry;
import org.apache.http.protocol.HttpService;
import org.apache.http.protocol.RequestConnControl;
import org.apache.http.protocol.RequestContent;
import org.apache.http.protocol.RequestExpectContinue;
import org.apache.http.protocol.RequestTargetHost;
import org.apache.http.protocol.RequestUserAgent;
import org.apache.http.protocol.ResponseConnControl;
import org.apache.http.protocol.ResponseContent;
import org.apache.http.protocol.ResponseDate;
import org.apache.http.protocol.ResponseServer;
import org.apache.log4j.Logger;

public class RequestListenerThread extends Thread
{
	/** Log4j object for logging */
	static Logger logger = Logger.getLogger(RequestListenerThread.class);

	private final ServerSocket serverSocket;
	private final HttpService httpService;

    /* Use Java 5.0 Concurrency Utilities for thread management */
    private ExecutorService taskPool = null;

    /* Number of threads to use for request handling */
    private int numTasks = 0;
    
    /**
     * Set up proxy server by setting the port number and 
     * creating a server socket to listen for requests on.
     * A vector of threads is also constructed, as they will 
     * be used to fulfill incoming requests.
     * 
     * @param port
     */
	public RequestListenerThread(int port, int nTasks) throws IOException
	{
		this.serverSocket = new ServerSocket(port);
		this.numTasks = nTasks;
		
		// Set up HTTP protocol processor for incoming connections
		BasicHttpProcessor inhttpproc = new BasicHttpProcessor();
		inhttpproc.addInterceptor(new ResponseDate());
		inhttpproc.addInterceptor(new ResponseServer());
		inhttpproc.addInterceptor(new ResponseContent());
		inhttpproc.addInterceptor(new ResponseConnControl());

		// Set up HTTP protocol processor for outgoing connections
		BasicHttpProcessor outhttpproc = new BasicHttpProcessor();
		outhttpproc.addInterceptor(new RequestContent());
		outhttpproc.addInterceptor(new RequestTargetHost());
		outhttpproc.addInterceptor(new RequestConnControl());
		outhttpproc.addInterceptor(new RequestUserAgent());
		outhttpproc.addInterceptor(new RequestExpectContinue());

		// Set up outgoing request executor
		HttpRequestExecutor httpexecutor = new HttpRequestExecutor();

		// Set up incoming request handler, we will use ProxyHandler
		// for all incoming client requests
		HttpRequestHandlerRegistry reqistry = new HttpRequestHandlerRegistry();
		reqistry.register("*", new ProxyHandler(outhttpproc, httpexecutor));

		// Set up the HTTP service
		this.httpService = new HttpService(inhttpproc,
				new NoConnectionReuseStrategy(), /* DefaultConnectionReuseStrategy() */
				new DefaultHttpResponseFactory());
		this.httpService.setParams(InsightProxyParams.getHttpParams());
		this.httpService.setHandlerResolver(reqistry);
		
        taskPool = Executors.newFixedThreadPool(numTasks);
        logger.info("Serving with pool size: " + numTasks);
	}

    /**
     * Begin execution of proxy server. Wait for incoming client requests and
     * serve using task pool.
     */
	public void run()
    {
        logger.info("Listening on port " + this.serverSocket.getLocalPort());

        try
        {
            while (!Thread.interrupted())
            {
                try
                {
                    // Set up incoming HTTP connection
                    Socket insocket = this.serverSocket.accept();
                    DefaultHttpServerConnection inconn = new DefaultHttpServerConnection();
                    inconn.bind(insocket, InsightProxyParams.getHttpParams());

                    // Set up outgoing HTTP connection
                    DefaultHttpClientConnection outconn = new DefaultHttpClientConnection();

                    /* Start execution of this worker thread */
                    taskPool.execute(new ProxyThread(this.httpService, inconn,
                            outconn));
                }
                catch (InterruptedIOException ex)
                {
                    break;
                }
                catch (IOException e)
                {
                    System.err
                            .println("I/O error initialising connection thread: "
                                    + e.getMessage());
                    e.printStackTrace();
                    break;
                }
            }
        }
        catch (Exception e)
        {
            System.err.println("Unknown error: " + e.getMessage());
            e.printStackTrace();
        }
        finally
        {
            taskPool.shutdown();
        }
    }
}