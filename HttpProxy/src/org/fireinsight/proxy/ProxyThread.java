package org.fireinsight.proxy;

import java.io.IOException;

import org.apache.http.ConnectionClosedException;
import org.apache.http.HttpClientConnection;
import org.apache.http.HttpException;
import org.apache.http.HttpServerConnection;
import org.apache.http.protocol.HttpContext;
import org.apache.http.protocol.HttpService;
import org.apache.http.protocol.SyncBasicHttpContext;
import org.apache.log4j.Logger;

public class ProxyThread implements Runnable
{
    /** Log4j object for logging */
    static Logger logger = Logger.getLogger(ProxyThread.class);
    
    private final HttpService httpservice;
    private final HttpServerConnection inconn;
    private final HttpClientConnection outconn;

    public ProxyThread(final HttpService httpservice,
            final HttpServerConnection inconn,
            final HttpClientConnection outconn)
    {
        super();
        this.httpservice = httpservice;
        this.inconn = inconn;
        this.outconn = outconn;
    }

    public void run()
    {
        HttpContext context = new SyncBasicHttpContext(null);

        // Bind connection objects to the execution context
        context.setAttribute(InsightProxyConstants.HTTP_IN_CONN, this.inconn);
        context.setAttribute(InsightProxyConstants.HTTP_OUT_CONN, this.outconn);

        try
        {
            while (!Thread.interrupted())
            {
                if (!this.inconn.isOpen())
                {
                    this.outconn.close();
                    break;
                }

                this.httpservice.handleRequest(this.inconn, context);

                Boolean keepalive = (Boolean) context
                        .getAttribute(InsightProxyConstants.HTTP_CONN_KEEPALIVE);
                if (!Boolean.TRUE.equals(keepalive))
                {
                    this.outconn.close();
                    this.inconn.close();
                    break;
                }
            }
        }
        catch (ConnectionClosedException ex)
        {
            System.err.println("Client closed connection");
            ex.printStackTrace();
        }
        catch (IOException ex)
        {
            System.err.println("I/O error: " + ex.getMessage());
            ex.printStackTrace();
        }
        catch (HttpException ex)
        {
            System.err.println("Unrecoverable HTTP protocol violation: "
                    + ex.getMessage());
            ex.printStackTrace();
        }
        finally
        {
            try
            {
                if (this.inconn != null)
                    this.inconn.shutdown();
            }
            catch (IOException ignore)
            {
                System.err.println("Could not close incoming connection: "
                        + ignore.getMessage());
                ignore.printStackTrace();
            }
            try
            {
                if (this.outconn != null)
                    this.outconn.shutdown();
            }
            catch (IOException ignore)
            {
                System.err.println("Could not close outgoing connection: "
                        + ignore.getMessage());
                ignore.printStackTrace();
            }
        }
    }
}