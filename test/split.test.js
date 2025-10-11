"use strict";

const { writeFile } = require("./../utils/file");
const {
  writeSplitAsyncAPISpec,
  writeChannels,
  writeComponents,
  sanitizeFileName,
  convertComponentsToRef,
} = require("./../utils/split");
const { describe, it, expect } = require("@jest/globals");
const path = require("path");
const fs = require("node:fs");

jest.mock("./../utils/file", () => ({
  writeFile: jest.fn(),
}));

jest.mock("node:fs", () => ({
  mkdirSync: jest.fn(),
}));

describe("asyncapi-format CLI splits tests", () => {
  const options = {
    outputDir: "/fake/output/dir",
    format: "yaml",
    output: "asyncapi.yaml",
    extension: "yaml",
  };

  const asyncapiDoc = {
    channels: {
      "user/signup": {
        subscribe: {
          message: {
            payload: {
              type: "object",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should split and write main asyncapi spec with $refs", async () => {
    await writeSplitAsyncAPISpec(asyncapiDoc, options);

    // Assert that the main asyncapi.yaml file is written with $refs
    expect(writeFile).toHaveBeenCalledWith(
      path.join("asyncapi.yaml"),
      {
        channels: {
          "user/signup": {
            $ref: "channels/user_signup.yaml",
          },
        },
        components: {
          schemas: {
            User: {
              $ref: "components/schemas/User.yaml",
            },
          },
        },
      },
      options
    );
  });

  it("should split and write channels to individual files", async () => {
    const channels = asyncapiDoc.channels;

    await writeChannels(channels, options);

    // Assert that each channel is written to its own file
    expect(writeFile).toHaveBeenCalledWith(
      path.join(options.outputDir, "channels", "user_signup.yaml"),
      channels["user/signup"],
      options
    );
  });

  it("should split and write components to individual files", async () => {
    const components = asyncapiDoc.components;

    await writeComponents(components, options);

    // Assert that each component is written to its own file
    expect(writeFile).toHaveBeenCalledWith(
      path.join(options.outputDir, "components/schemas", "User.yaml"),
      components.schemas.User,
      options
    );
  });

  it("should sanitize file names properly", () => {
    const fileName = "/user/signup/{userId}";
    const sanitized = sanitizeFileName(fileName);
    expect(sanitized).toBe("user_signup_{userId}");
  });

  // Test for convertComponentsToRef using real traversal
  it("should convert component $ref to file path", () => {
    const components = {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            profile: {
              $ref: "#/components/schemas/Profile",
            },
          },
        },
      },
    };

    // Call convertComponentsToRef without mocking traverse
    const result = convertComponentsToRef(components, "yaml", ".");

    // Assert that the $ref is converted correctly
    expect(result.schemas.User.properties.profile.$ref).toBe(
      "components/schemas/Profile.yaml"
    );

    // Assert that non-$ref values remain unchanged
    expect(result.schemas.User.properties.id.type).toBe("string");
  });

  it("should handle nested $ref structures in components", () => {
    const components = {
      schemas: {
        NestedSchema: {
          type: "object",
          properties: {
            nested: {
              type: "object",
              properties: {
                deep: {
                  $ref: "#/components/schemas/DeepSchema",
                },
              },
            },
          },
        },
      },
    };

    // Call convertComponentsToRef to check nested $ref conversion
    const result = convertComponentsToRef(components, "yaml", ".");

    // Assert that the deeply nested $ref is converted
    expect(
      result.schemas.NestedSchema.properties.nested.properties.deep.$ref
    ).toBe("components/schemas/DeepSchema.yaml");
  });
});
