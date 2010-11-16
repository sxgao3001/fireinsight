package org.fireinsight.util;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import org.apache.log4j.Logger;

/**
 * Common utility class for loading properties values.
 * 
 * @author Steven Gao
 */
public class Props {
	/** Log4j object for logging */
	static Logger logger = Logger.getLogger(Props.class.getName());

	/** Default environment properties file to use */
	private static String defaultEnvProp = "/props/env/dev/scriptinsight.properties";
	
	/** Points to properties file once it is successfully loaded */
	private static Properties envProps;

	/** Load the properties file */
	static {
		try {
			String envPropFileName = null;
			if (logger.isDebugEnabled()) {
				logger.debug("Props: envPropFileName : " + envPropFileName);
			}
			if (envPropFileName == null || "".equals(envPropFileName.trim())) {
				if (logger.isDebugEnabled()) {
					logger.debug("Props: Using default env file: "
							+ defaultEnvProp);
				}
				envPropFileName = defaultEnvProp;
			}
			InputStream rt = Props.class.getResourceAsStream(envPropFileName);
			envProps = new Properties();
			envProps.load(rt);
			rt.close();
		} catch (IOException e) {
			logger
					.error("Error: Props: Cannot load regencegame.properties file :::"
							+ e);
		} catch (Exception e) {
			logger
					.error("Error: Props: Cannot load regencegame.properties file :::"
							+ e);
		}

	}

	/** Getter method to retrieve a specific entry from properties file */
	public static String getProperty(String prop) {
		String propValues = null;
		if (envProps != null) {
			propValues = envProps.getProperty(prop);
			if (logger.isDebugEnabled()) {
				logger.debug("Props: Request for property [" + prop + "="
						+ propValues + "]");
			}
		}
		return propValues;
	}

	/** Getter method to retrieve path for default environment properties file */
	public static String getDefaultPath() {
		return defaultEnvProp;
	}
}
