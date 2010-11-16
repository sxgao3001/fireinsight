package org.fireinsight.proxy.entity;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;

import org.apache.commons.io.FilenameUtils;
import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.entity.HttpEntityWrapper;
import org.apache.http.util.EntityUtils;
import org.apache.log4j.Logger;
import org.fireinsight.util.Props;
import org.fireinsight.util.StringZipper;

/**
 * Behaves almost exactly like the BufferedHttpEntity type (from HttpCore
 * library). The difference is we perform some processing on the content before
 * returning it to the invoker.
 * 
 * A wrapping entity that buffers its content. The buffered entity is always
 * repeatable. The content is read into a buffer once and provided from there as
 * often as required.
 * 
 */
public class BufferedInsightProxyHttpEntity extends HttpEntityWrapper
{
    /** Log4j object for logging */
    static Logger logger = Logger
            .getLogger(BufferedInsightProxyHttpEntity.class);

    /** FireInsight property name */
    private static final String DATA_PATH_PROP = "DataPath";

    /** FireInsight property name */
    private static final String SAVE_FILE_PREF_PROP = "SaveTempFiles";

    private static final String DIR_PATH = Props.getProperty(DATA_PATH_PROP);
    private static final boolean SAVE_FILE_OPTION = 
        Boolean.parseBoolean(Props.getProperty(SAVE_FILE_PREF_PROP).trim());

    private final byte[] buffer;

    /**
     * Construct a buffered HTTP entity containing JavaScript. During
     * construction we buffer the content and store it within the byte array
     * called buffer. But before buffering we determine whether or not to
     * instrument the original source code with our own analysis code.
     * 
     * @param entity
     * @param filePath
     * @throws IOException
     */
    public BufferedInsightProxyHttpEntity(final HttpEntity entity,
            final String filePath) throws IOException
    {
        super(entity);

        String fullPath = DIR_PATH + "/" + filterURI(filePath);
        String filename = FilenameUtils.getName(fullPath);
        byte[] tempBuffer;
        boolean isZipped = false;

        /*
         * JavaScript is commonly compressed, so we need to check for this and
         * if it is compressed use the GZIPInputStream to uncompress the input
         * stream.
         * 
         * Solution taken from:
         * 
         * @ aleem http://markmail.org/message/gvz4qpuf6xhk2ujg
         */
        Header contentEncoding = getContentEncoding();
        long contentLength = getContentLength();

        if (contentEncoding != null
                && contentEncoding.getValue().equalsIgnoreCase("gzip")) {
            isZipped = true;
        }

        if (isZipped) {
            InputStream instream = entity.getContent();
            if (instream != null) {
                if (entity.getContentLength() > Integer.MAX_VALUE) {
                    throw new IllegalArgumentException(
                            "HTTP entity too large to be buffered in memory");
                }
                tempBuffer = StringZipper.unzipStringFromInputStream(instream)
                        .getBytes();
            }
            else {
                logger.error("HTTP entity cannot have null input stream");
                tempBuffer = null;
            }
        }
        /* Otherwise, it is not compressed so proceed as normal */
        else {
            tempBuffer = EntityUtils.toByteArray(entity);
        }

        // TODO: Remove this debugging code 
/*        System.out.println("Content Character Set: "
                + EntityUtils.getContentCharSet(this));
        System.out.println("Content Length: " + contentLength);
        System.out.println("Content Length Confirm: " + tempBuffer.length);
*/
        /* Save JavaScript to file system */
        if (SAVE_FILE_OPTION == true) {
            OutputStream fileOut = null;
            try {
                File dir = new File(FilenameUtils.getFullPath(fullPath));
                System.out.println("Directory ["
                        + FilenameUtils.getFullPath(fullPath) + "] created? "
                        + dir.mkdirs());
                File file = new File(dir, filename);
                System.out.println("File name = [" + filename + "]");
                file.createNewFile();
                fileOut = new java.io.FileOutputStream(file);
                fileOut = new java.io.BufferedOutputStream(fileOut);
                fileOut.write(tempBuffer);
            }
            catch (IOException ioe) {
                ioe.printStackTrace();
                System.out.println("Continue ... ");
            }
            finally {
                if (fileOut != null) {
                    fileOut.close();
                }
            }            
        }

        /* Parse JavaScript */
        String result = null;
        try {
            Reader r = new InputStreamReader(new ByteArrayInputStream(tempBuffer));
            //result = org.mozilla.javascript.parseJS.transform(fullPath, r);
            result = org.mozilla.javascript.parseJS.transform(filePath, r);
            //System.out.println("Parsed: " + filename);
            // System.out.println("JavaScript: " + result);
        }
        catch (Exception e) {
            System.err
                    .println("Error parsing JavaScript in BufferedInsightProxyHttpEntity");
            e.printStackTrace();
        }

        /* FIXME: For testing purposes, remove this section */
        /*
         * if (isZipped) { System.out.println("**GZIP** JavaScript: " + new
         * String(tempBuffer) result); } else {
         * System.out.println("JavaScript: " + new String(tempBuffer) result); }
         */

        /* Set buffered content, if content as gzip, re-compress the data */
        if (isZipped) {
            // this.buffer = StringZipper.zipStringToBytes(new
            // String(tempBuffer));
            this.buffer = StringZipper.zipStringToBytes(result);
        }
        else {
            // this.buffer = tempBuffer;
            this.buffer = result.getBytes();
        }
    }

    /*
     * (non-Javadoc)
     * 
     * @see org.apache.http.entity.HttpEntityWrapper#getContentLength()
     */
    @Override
    public long getContentLength()
    {
        if (this.buffer != null) {
            return this.buffer.length;
        }
        else {
            return wrappedEntity.getContentLength();
        }
    }

    /*
     * (non-Javadoc)
     * 
     * @see org.apache.http.entity.HttpEntityWrapper#getContent()
     */
    @Override
    public InputStream getContent() throws IOException
    {
        return new ByteArrayInputStream(this.buffer);
    }

    /**
     * Tells that this entity does not have to be chunked.
     * 
     * @return <code>false</code>
     */
    @Override
    public boolean isChunked()
    {
        return (buffer == null) && wrappedEntity.isChunked();
    }

    /**
     * Tells that this entity is repeatable.
     * 
     * @return <code>true</code>
     */
    @Override
    public boolean isRepeatable()
    {
        return true;
    }

    @Override
    public void writeTo(final OutputStream outstream) throws IOException
    {
        if (outstream == null) {
            throw new IllegalArgumentException("Output stream may not be null");
        }
        outstream.write(this.buffer);
    }

    // non-javadoc, see interface HttpEntity
    @Override
    public boolean isStreaming()
    {
        return (buffer == null) && wrappedEntity.isStreaming();
    }

    public static void main(String args[])
    {
        File dir1 = new File(".");
        File dir2 = new File("..");
        try {
            System.out.println("Current dir : " + dir1.getCanonicalPath());
            System.out.println("Parent  dir : " + dir2.getCanonicalPath());
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Filter out characters that are not allowed in a file system directory name. 
     *   E.g. a URI like this:
     *          http://l.yimg.com/d/combo?ca/js&ca/pa_0.0.6.js
     * Needs to get renamed to this:
     *          l.yimg.com/d/comboca/jsca/pa_0.0.6.js
     * @param URI
     * @return
     */
    private String filterURI(String URI) {
        if (URI == null)
            return null;
        //System.err.println("URI BEFORE: " + URI);
        String result = URI.replaceAll("http://", "");
        result = result.replaceAll(":", "");
        result = result.replaceAll("&", "");
        result = result.replaceAll("\\?", "");
        result = result.replaceAll("=", "");
        result = result.replaceAll("%", "");
        //System.err.println("URI AFTER: " + result);        
        return result;
    }    

} // class BufferedInsightProxyHttpEntity
