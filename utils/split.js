const path = require("path");
const traverse = require("traverse");
const { writeFile } = require("./file");

/**
 * Write the split AsyncAPI specification with $ref links
 * @param {object} asObj - AsyncAPI document
 * @param {object} options - Split options
 * @returns {Promise<void>}
 */
async function writeSplitAsyncAPISpec(asObj, options) {
  const { outputDir, format } = options;
  const asyncapiDoc = { ...asObj };
  const ext = `${options.extension}`;

  // Replace channels with $ref links
  if (asyncapiDoc?.channels) {
    Object.keys(asyncapiDoc.channels).forEach((channelKey) => {
      const sanitizedChannel = sanitizeFileName(channelKey);
      asyncapiDoc.channels[channelKey] = {
        $ref: `channels/${sanitizedChannel}.${ext}`,
      };
    });
  }

  // Replace components with $ref links
  if (asyncapiDoc?.components) {
    Object.keys(asyncapiDoc.components).forEach((componentType) => {
      Object.keys(asyncapiDoc.components[componentType]).forEach(
        (componentName) => {
          asyncapiDoc.components[componentType][componentName] = {
            $ref: `components/${componentType}/${componentName}.${ext}`,
          };
        }
      );
    });
  }

  // Write the asyncapi.yaml file
  const outputFile = options.output;
  await writeFile(outputFile, asyncapiDoc, options);
}

/**
 * Write channels to individual files
 * @param {object} channels - Channels object from AsyncAPI
 * @param {object} options - Split options
 * @returns {Promise<void>}
 */
async function writeChannels(channels, options) {
  const { outputDir } = options;
  const ext = `${options.extension}`;
  const channelsDir = path.join(outputDir || "./", "channels");

  for (const channelKey of Object.keys(channels)) {
    const sanitizedChannel = sanitizeFileName(channelKey);
    const filePath = path.join(channelsDir, `${sanitizedChannel}.${ext}`);

    // Update any component references to the proper file location in channels
    const updatedChannel = convertComponentsToRef(
      channels[channelKey],
      ext,
      "channels"
    );

    // Write each channel to its own file
    await writeFile(filePath, updatedChannel, options);
  }
}

/**
 * Write components to individual files
 * @param {object} components - Components object from AsyncAPI
 * @param {object} options - Split options
 * @returns {Promise<void>}
 */
async function writeComponents(components, options) {
  const { outputDir } = options;
  const ext = `${options.extension}`;

  const componentsDir = path.join(outputDir || "./", "components");

  for (const componentType of Object.keys(components)) {
    for (const componentName of Object.keys(components[componentType])) {
      const fileDir = path.join(componentsDir, componentType);
      const filePath = path.join(fileDir, `${componentName}.${ext}`);

      // Update any component references within components
      const updatedComponent = convertComponentsToRef(
        components[componentType][componentName],
        ext,
        path.join("components", componentType)
      );

      // Write each component to its own file
      await writeFile(filePath, updatedComponent, options);
    }
  }
}

/**
 * Convert component references to relative file paths
 * @param {object} obj - Object to traverse
 * @param {string} ext - File extension
 * @param {string} currentFileDir - Current file directory path
 * @returns {object} Updated object with converted $ref
 */
function convertComponentsToRef(obj, ext, currentFileDir) {
  // Traverse the object to find and update $ref
  traverse(obj).forEach(function (node) {
    if (this.key === "$ref") {
      const refValue = node;
      const match = refValue.match(/^#\/components\/([^\/]+)\/([^\/]+)$/);

      if (match) {
        const componentType = match[1];
        const componentName = match[2];

        // Determine the correct relative path
        const refFilePath = path.join(
          "components",
          componentType,
          `${componentName}.${ext}`
        );
        const relativePath = path
          .relative(currentFileDir, refFilePath)
          .replace(/\\/g, "/");

        // Update the reference to point to the correct relative path
        this.update(relativePath);
      }
    }
  });

  return obj;
}

/**
 * Sanitize file name to be filesystem-safe
 * @param {string} fileName - Original file name
 * @returns {string} Sanitized file name
 */
function sanitizeFileName(fileName) {
  // Replace slashes and any other problematic characters with underscores
  return fileName
    .replace(/^\//, "")
    .replace(/\//g, "_")
    .replace(/[^a-zA-Z0-9_{}]/g, "");
}

module.exports = {
  writeSplitAsyncAPISpec,
  writeChannels,
  writeComponents,
  convertComponentsToRef,
  sanitizeFileName,
};
