package org.fireinsight.proxy;

public class InsightProxyException extends Exception
{
    private static final long serialVersionUID = 1111258507305672072L;
    
    /**
     * Creates a new ConnectionClosedException with the specified detail message.
     * 
     * @param message The exception detail message
     */
    public InsightProxyException(final String message) {
        super(message);
    }    
}
