/**
 * 
 */
package org.fireinsight.proxy;

import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.CoreConnectionPNames;
import org.apache.http.params.CoreProtocolPNames;
import org.apache.http.params.HttpParams;

/**
 * @author Steven Gao
 * 
 */
public class InsightProxyParams
{
	private static final HttpParams params = new BasicHttpParams();

	static
	{
		params
			.setIntParameter(CoreConnectionPNames.SO_TIMEOUT, 50000)
            .setIntParameter(CoreConnectionPNames.CONNECTION_TIMEOUT, 50000)
			.setIntParameter(CoreConnectionPNames.SOCKET_BUFFER_SIZE,8 * 1024)
			.setBooleanParameter(CoreConnectionPNames.STALE_CONNECTION_CHECK, true)
			.setBooleanParameter(CoreConnectionPNames.TCP_NODELAY, true)
            .setParameter(CoreProtocolPNames.USER_AGENT, "HttpComponents/1.1");
			//.setParameter(CoreProtocolPNames.ORIGIN_SERVER, "HttpComponents/1.1");
	}

	public static HttpParams getHttpParams()
	{
		return params;
	}
}
