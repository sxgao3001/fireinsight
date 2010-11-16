package org.fireinsight.util;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import org.apache.http.util.CharArrayBuffer;
import org.apache.http.util.EntityUtils;

/**
 * Couple of String gzipping utilities.
 * 
 * @author Scott McMaster
 * @author Steven Gao (unedited, used for this project)
 */
public class StringZipper
{

    /**
     * Gzip the input string into a byte[].
     * 
     * @param input
     * @return
     * @throws IOException
     */
    public static byte[] zipStringToBytes(String input) throws IOException
    {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        BufferedOutputStream bufos = new BufferedOutputStream(
                new GZIPOutputStream(bos));
        bufos.write(input.getBytes());
        bufos.close();
        byte[] retval = bos.toByteArray();
        bos.close();
        return retval;
    }

    /**
     * Unzip a string out of the given gzipped byte array.
     * 
     * @param bytes
     * @return
     * @throws IOException
     */
    public static String unzipStringFromBytes(byte[] bytes) throws IOException
    {
        ByteArrayInputStream bis = new ByteArrayInputStream(bytes);
        BufferedInputStream bufis = new BufferedInputStream(
                new GZIPInputStream(bis));
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[1024];
        int len;
        while ((len = bufis.read(buf)) > 0)
        {
            bos.write(buf, 0, len);
        }
        String retval = bos.toString();
        bis.close();
        bufis.close();
        bos.close();
        return retval;
    }
    
    /**
     * Unzip a string out of the given gzipped InputStream.
     * 
     * @param is
     * @return
     * @throws IOException
     */
    public static String unzipStringFromInputStream(InputStream is) throws IOException
    {
        String result = null; 
        InputStream instream = new GZIPInputStream(is);
        if (instream != null)
        {
            Reader reader = new InputStreamReader(instream);
            CharArrayBuffer buffer = new CharArrayBuffer(4096);
            try
            {
                char[] tmp = new char[1024];
                int l;
                while ((l = reader.read(tmp)) != -1)
                {
                    buffer.append(tmp, 0, l);
                }
            }
            finally
            {
                reader.close();
                instream.close();
                result = buffer.toString(); 
            }
        }
        return result;
    }

    /**
     * Static class.
     * 
     */
    private StringZipper()
    {
    }
}