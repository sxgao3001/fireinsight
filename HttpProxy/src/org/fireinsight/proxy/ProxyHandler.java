package org.fireinsight.proxy;

import java.io.IOException;
import java.net.Socket;

import org.apache.http.ConnectionReuseStrategy;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpException;
import org.apache.http.HttpRequest;
import org.apache.http.HttpResponse;
import org.apache.http.impl.DefaultHttpClientConnection;
import org.apache.http.impl.NoConnectionReuseStrategy;
import org.apache.http.protocol.ExecutionContext;
import org.apache.http.protocol.HTTP;
import org.apache.http.protocol.HttpContext;
import org.apache.http.protocol.HttpProcessor;
import org.apache.http.protocol.HttpRequestExecutor;
import org.apache.http.protocol.HttpRequestHandler;
import org.apache.log4j.Logger;
import org.fireinsight.proxy.entity.BufferedInsightProxyHttpEntity;

public class ProxyHandler implements HttpRequestHandler
{
    /** Log4j object for logging */
    static Logger logger = Logger.getLogger(ProxyHandler.class);

    private static int countParsed = 0;
    private static int countUnparsed = 0;
    private static int countTotal = 0;

    private final HttpProcessor httpproc;
    private final HttpRequestExecutor httpexecutor;
    private final ConnectionReuseStrategy connStrategy;

    public ProxyHandler(final HttpProcessor httpproc,
            final HttpRequestExecutor httpexecutor)
    {
        super();
        this.httpproc = httpproc;
        this.httpexecutor = httpexecutor;
        this.connStrategy = new NoConnectionReuseStrategy(); /* DefaultConnectionReuseStrategy() */
    }

    public void handle(final HttpRequest request, final HttpResponse response,
            final HttpContext context) throws HttpException, IOException
    {
        DefaultHttpClientConnection outConn = (DefaultHttpClientConnection) context.getAttribute(
                InsightProxyConstants.HTTP_OUT_CONN);

        String target = request.getFirstHeader("Host").getValue();
        String hostName = null;
        int port = 80;

        /* Parse "Host" header field, which will be used to 
         * forward request to target server 
         */
        if (target != null)
        {
            String[] targetAddress = target.split(":");
            if (targetAddress.length > 0)
                hostName = targetAddress[0];
            if (targetAddress.length > 1)
            {
                port = Integer.parseInt(targetAddress[1]);
            }
        }
        else 
        {
            throw new HttpException("Could not parse host name for client request");
        }

        Socket outsocket = new Socket(hostName, port);
        /* Check if connection is already open, if not perform connection binding */
        if (!outConn.isOpen()) 
        {
            outConn.bind(outsocket, InsightProxyParams.getHttpParams());            
        }
        context.setAttribute(ExecutionContext.HTTP_CONNECTION, outConn);
        context.setAttribute(ExecutionContext.HTTP_TARGET_HOST, target);

        // Remove hop-by-hop headers
        request.removeHeaders(HTTP.CONTENT_LEN);
        request.removeHeaders(HTTP.TRANSFER_ENCODING);
        //request.removeHeaders(HTTP.CONN_DIRECTIVE);
        //request.removeHeaders("Keep-Alive");
        request.removeHeaders("Proxy-Authenticate");
        request.removeHeaders("TE");
        request.removeHeaders("Trailers");
        request.removeHeaders("Upgrade");

        this.httpexecutor.preProcess(request, this.httpproc, context);
        HttpResponse targetResponse = this.httpexecutor.execute(request,
                outConn, context);
        this.httpexecutor.postProcess(response, this.httpproc, context);

        /*
         * Determine what content type is for the current response. If content
         * is deemed as JavaScript, specifically JavaScript with a file
         * extension.js, then use our custom HttpEntity class to add
         * instrumentation code. The reason we do this is to avoid parsing
         * arbitrary segments of JavaScript that do not correspond to any
         * original source code file. We can argue that such segments of
         * JavaScript are no interest to our software tool.
         * 
         * E.g. a piece of JSON output containing only data sent from the server
         * to the client-side JavaScript should not be instrumented, as this
         * would corrupt the original data.
         * 
         * Otherwise, leave content of response object untouched
         */
        HttpEntity entity = null;
        if (isJavaScriptEntity(targetResponse) && !shouldIgnore(request)) {
            /* Get URI for requested JavaScript file */
            String fileURI = request.getRequestLine().getUri();
            
            /* Only instrument JavaScript files that have a *.js extension and are
             * NOT on the ignore list
             */
            if (fileURI.endsWith(".js") && !InsightProxyMain.IGNORE_LIST.contains(fileURI)) {
                entity = new BufferedInsightProxyHttpEntity(targetResponse.getEntity(), fileURI);
                System.err.println(request.getRequestLine() + " **JavaSript**");
                countParsed++;
            }
            else {
                System.err.println(request.getRequestLine() + " **JavaSript IGNORED**");                
                entity = targetResponse.getEntity();
                countUnparsed++;
            }

/*            System.out.println("\t\t\t\t Is repeatable? " + entity.isRepeatable());
            System.out.println("\t\t\t\t Is streaming? " + entity.isStreaming());
            System.out.println("\t\t\t\t Content-Type: " + entity.getContentType());
            System.out.println("\t\t\t\t Content-Encoding: " + entity.getContentEncoding());
            System.out.println("\t\t\t\t Content-Length: " + entity.getContentLength());
*/        }
        else {
            System.out.println(request.getRequestLine() + " ");
            entity = targetResponse.getEntity();
            countUnparsed++;
        }
        countTotal++;
        
        //System.out.println("Total [" + countTotal + "], Parsed [" + countParsed + "], Unparsed [" + countUnparsed + "]");

        /* If content was of type JavaScript, then intercept 
         * content from response object 
         */
        Header contentType = targetResponse.getFirstHeader("Content-Type");
        //Header contentEncoding = targetResponse.getFirstHeader("Content-Encoding");

        if (contentType != null && contentType.getValue().contains("javascript") && request.getRequestLine().getUri().endsWith(".js")) 
        {
            try {
                logger.info(">> JAVASCRIPT: " + request.getRequestLine().getUri()
                        + " isRepeatable=["
                        + targetResponse.getEntity().isRepeatable()
                        + "], isStreaming=[" + targetResponse.getEntity().isStreaming() + "]");

                Header contentLength = targetResponse.getFirstHeader("Content-Length");
                if (contentLength != null)
                {
                    targetResponse.removeHeader(contentLength);
                }
                targetResponse.addHeader("Content-Length", "" + entity.getContentLength());
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Remove hop-by-hop headers
        targetResponse.removeHeaders(HTTP.CONTENT_LEN);
        targetResponse.removeHeaders(HTTP.TRANSFER_ENCODING);
        //targetResponse.removeHeaders(HTTP.CONN_DIRECTIVE);
        //targetResponse.removeHeaders("Keep-Alive");
        targetResponse.removeHeaders("TE");
        targetResponse.removeHeaders("Trailers");
        targetResponse.removeHeaders("Upgrade");

        response.setStatusLine(targetResponse.getStatusLine());
        response.setHeaders(targetResponse.getAllHeaders());
        response.setEntity(entity);

        /* Log info on the current request being processed */
        logInfo(request, targetResponse, entity);
        
        boolean keepalive = this.connStrategy.keepAlive(response, context);
        context.setAttribute(InsightProxyConstants.HTTP_CONN_KEEPALIVE,
                new Boolean(keepalive));
    }

    /**
     * Use logger to log request and response information for the current
     * request being processed.
     * 
     * @param request
     * @param response
     */
    private synchronized void logInfo(final HttpRequest request, final HttpResponse response, final HttpEntity entity) {
        logger.info(">> Request [" + request.getRequestLine().getUri() + "]");

        if (entity != null)
        {
            logger.info("<<         Response: " + response.getStatusLine());
            logger.info("<<         Response: HttpEntity Type: "
                    + response.getEntity().getClass().getName());            
        }
        else
        {
            logger.error("<<        No response entity found!");
        }

        Header[] requestHeaders = request.getAllHeaders();

        logger.info(">>               Request Headers: ");
        for (int i=0; i<requestHeaders.length; i++) 
        {
            logger.info("                              " + requestHeaders[i].toString());
        }

        Header[] responseHeaders = response.getAllHeaders();
        
        logger.info(">>               Response Headers: ");
        for (int i=0; i<responseHeaders.length; i++) 
        {
            logger.info("                               " + responseHeaders[i].toString());
        }
                
    }

    /**
     * Determines whether the given HttpResponse contains JavaScript content.
     * 
     * @param response
     * @return true, if content is of type "javascript". Otherwise, returns
     *         false.
     */
    private boolean isJavaScriptEntity(HttpResponse response) {
        Header contentType = response.getFirstHeader("Content-Type"); 

        if (contentType != null && contentType.getValue().contains("javascript")) {
            return true;
        }

        return false;
    }

    /**
     * @param request
     * @return true, if request contains a header with name "FireInsightIgnore"
     *         set to true. Otherwise, returns false.
     */
    private boolean shouldIgnore(HttpRequest request) {
        Header insightType = request.getFirstHeader("FireInsightIgnore");

        if (insightType != null && Boolean.parseBoolean(insightType.getValue())) {
            return true;
        }
        
        return false;
    }
}