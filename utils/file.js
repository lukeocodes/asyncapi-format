const fs = require("fs");
const yaml = require("js-yaml");
const http = require("http");
const https = require("https");
const { dirname } = require("path");
const bundler = require("api-ref-bundler");

/**
 * Converts a string object to a JSON/YAML object.
 * @param {string} str - The input string to be parsed (either JSON or YAML).
 * @param {object} options - Options to define the parsing behavior.
 * @returns {Promise<object>} Parsed data object.
 */
async function parseString(str, options = {}) {
  // Exit early
  if (str.length === 0) {
    return str;
  }

  // Default to YAML format unless specified as JSON
  const toYaml =
    options.format !== "json" &&
    (!options.hasOwnProperty("json") || options.json !== true);

  if (toYaml) {
    try {
      const obj = yaml.load(str);
      if (typeof obj === "object") {
        return obj;
      } else {
        throw new SyntaxError("Invalid YAML");
      }
    } catch (yamlError) {
      return yamlError;
    }
  } else {
    try {
      // Try parsing as JSON
      return JSON.parse(str);
    } catch (jsonError) {
      return jsonError;
    }
  }
}

/**
 * Checks if a given string is valid JSON.
 * @param {string} str - The input string to check.
 * @returns {Promise<boolean>} True if the string is valid JSON, false otherwise.
 */
async function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a given string is valid YAML.
 * @param {string} str - The input string to check.
 * @returns {Promise<boolean>} True if the string is valid YAML, false otherwise.
 */
async function isYaml(str) {
  try {
    const rest = yaml.load(str);
    return typeof rest === "object";
  } catch (e) {
    return false;
  }
}

/**
 * Detects the format of a given string (either JSON or YAML).
 * @param {string} str - The input string to check.
 * @returns {Promise<string>} "json", "yaml", or "unknown" based on the detected format.
 */
async function detectFormat(str) {
  if ((await isJSON(str)) !== false) {
    return "json";
  } else if ((await isYaml(str)) !== false) {
    return "yaml";
  } else {
    return "unknown";
  }
}

/**
 * Reads a file (local or remote) and returns its content as a string.
 * @param {string} filePath - The path to the file (local or URL).
 * @param {object} options - Parse file options (e.g., format detection).
 * @returns {Promise<string>} The content of the file as a string.
 */
async function readFile(filePath, options) {
  try {
    const isRemoteFile =
      filePath.startsWith("http://") || filePath.startsWith("https://");

    let fileContent;
    if (isRemoteFile) {
      fileContent = await getRemoteFile(filePath);
    } else {
      const isYamlFile =
        filePath.endsWith(".yaml") || filePath.endsWith(".yml");
      isYamlFile ? (options.format = "yaml") : (options.format = "json");
      fileContent = await getLocalFile(filePath);
    }

    // Check JSON or YAML
    (await isJSON(fileContent))
      ? (options.format = "json")
      : (options.format = "yaml");
    return fileContent;
  } catch (err) {
    throw err;
  }
}

/**
 * Parses a JSON/YAML file and returns the parsed object
 * @param {string} filePath - The path to the JSON/YAML file.
 * @param {object} options - Parse file options.
 * @returns {Promise<object>} Parsed data object.
 */
async function parseFile(filePath, options = {}) {
  try {
    // Read local or remote file content and get format JSON or YAML
    let rawContent = await readFile(filePath, options);

    if (rawContent.includes("$ref") && options.bundle === true) {
      // Handler to Resolve references
      const resolver = async (sourcePath) => {
        let refContent = await readFile(sourcePath, options);
        return await parseString(refContent, options);
      };

      const onErrorHook = (msg) => {
        throw new Error(msg);
      };

      // Use the bundler to resolve external refs and bundle the document
      return bundler.bundle(filePath, resolver, {
        ignoreSibling: false,
        hooks: { onError: onErrorHook },
      });
    }

    // Parse file content as JSON/YAML
    return await parseString(rawContent, options);
  } catch (err) {
    throw err;
  }
}

/**
 * Converts a data object to a JSON/YAML string representation.
 * @param {object} obj - The data object to stringify.
 * @param {object} options - Stringify options (e.g., line width, format).
 * @returns {Promise<string>} The object as a string in JSON/YAML format.
 */
async function stringify(obj, options = {}) {
  try {
    let output;
    // Default to YAML format
    const toYaml =
      options.format !== "json" &&
      (!options.hasOwnProperty("json") || options.json !== true);

    if (toYaml) {
      // Set YAML options
      const yamlOptions = {};
      yamlOptions.lineWidth =
        (options.lineWidth && options.lineWidth === -1
          ? Infinity
          : options.lineWidth) || Infinity;

      // Convert object to YAML string
      output = yaml.dump(obj, yamlOptions);
    } else {
      // Convert object to JSON string
      output = JSON.stringify(obj, null, 2);
    }

    // Return the stringify output
    return output;
  } catch (err) {
    // Handle errors or rethrow
    throw err;
  }
}

/**
 * Writes an object to a JSON/YAML file.
 * @param {string} filePath - The path to the output file.
 * @param {object} data - The data object to write.
 * @param {object} options - Write options (e.g., format).
 * @returns {Promise<void>} Resolves when the file is written successfully.
 */
async function writeFile(filePath, data, options = {}) {
  try {
    let output;
    const isYamlFile = filePath.endsWith(".yaml") || filePath.endsWith(".yml");

    if (isYamlFile) {
      // Convert Object to YAML string
      options.format = "yaml";
      output = await stringify(data, options);
    } else {
      // Convert Object to JSON string
      options.format = "json";
      output = await stringify(data, options);
    }

    const dir = dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the output to the file
    fs.writeFileSync(filePath, output, "utf8");
  } catch (err) {
    console.error(
      "\x1b[31m",
      `Error writing file "${filePath}": ${err.message}`
    );
    throw err;
  }
}

/**
 * Reads a local file and returns the content.
 * @param {string} filePath - The path to the local file.
 * @returns {Promise<string>} The content of the file as a string.
 */
async function getLocalFile(filePath) {
  try {
    const inputContent = fs.readFileSync(filePath, "utf8");
    return inputContent;
  } catch (err) {
    throw err;
  }
}

/**
 * Reads a remote file and returns the content.
 * @param {string} filePath - The URL to the remote file.
 * @returns {Promise<string>} The content of the remote file as a string.
 */
async function getRemoteFile(filePath) {
  const protocol = filePath.startsWith("https://") ? https : http;

  const inputContent = await new Promise((resolve, reject) => {
    protocol.get(filePath, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`${res.statusCode} ${res.statusMessage}`));
      }
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        resolve(Buffer.concat(chunks).toString());
      });
      res.on("error", (err) => {
        reject(new Error(`${err.message}`));
      });
    });
  });
  return inputContent;
}

module.exports = {
  readFile,
  parseString,
  parseFile,
  isJSON,
  isYaml,
  detectFormat,
  stringify,
  writeFile,
  getLocalFile,
  getRemoteFile,
};
