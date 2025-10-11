const testUtils = require("../test/__utils__/test-utils");
const fs = require("fs");

describe("asyncapi-format CLI command", () => {
  it("should output the help", async () => {
    let result = await testUtils.cli([`--help`], ".");
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stderr).toMatchSnapshot();
  });

  it("should use the sortFile", async () => {
    const path = `test/yaml-custom`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");
    const setting = `${path}/customSort.yaml`;

    let result = await testUtils.cli([inputFile, `--sortFile ${setting}`], ".");
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should use the casingFile", async () => {
    const path = `test/yaml-casing`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");
    const setting = `${path}/customCasing.yaml`;

    let result = await testUtils.cli(
      [inputFile, `--casingFile ${setting}`, `--no-sort`],
      "."
    );
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should use the filterFile", async () => {
    const path = `test/yaml-filter-custom`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");
    const setting = `${path}/customFilter.yaml`;

    let result = await testUtils.cli(
      [inputFile, `--filterFile ${setting}`, `--no-sort`],
      "."
    );
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should use the sortComponentsFile", async () => {
    const path = `test/yaml-sort-components`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");
    const setting = `${path}/customSortComponents.yaml`;

    let result = await testUtils.cli(
      [inputFile, `--sortComponentsFile ${setting}`],
      "."
    );
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should use the no-sort", async () => {
    const path = `test/yaml-no-sort`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");

    let result = await testUtils.cli([inputFile, `--no-sort`], ".");
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should show unused components", async () => {
    const path = `test/yaml-filter-unused-components`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");
    const setting = `${path}/customFilter.yaml`;

    let result = await testUtils.cli(
      [inputFile, `--filterFile ${setting}`, `--no-sort`, `-v`],
      "."
    );
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should use the rename", async () => {
    const path = `test/yaml-rename`;
    const inputFile = `${path}/input.yaml`;
    const outputFile = `${path}/output.yaml`;
    const output = fs.readFileSync(outputFile, "utf8");

    let result = await testUtils.cli(
      [inputFile, `--rename "Streetlights - AsyncAPI 2.0"`, `--no-sort`],
      "."
    );
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    expect(sanitize(result.stderr)).toStrictEqual(sanitize(output));
  });

  it("should bundle external $refs", async () => {
    const path = `test/yaml-default`;
    const inputFile = `${path}/input.yaml`;

    let result = await testUtils.cli([inputFile, `--bundle`, `--no-sort`], ".");
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toMatchSnapshot();
    // Verify bundling happens by checking output doesn't contain file references
    expect(result.stderr).not.toContain("./components");
  });

  it("should split the AsyncAPI document", async () => {
    const path = `test/yaml-default`;
    const inputFile = `${path}/input.yaml`;
    const tmpDir = require("os").tmpdir();
    const outputFile = `${tmpDir}/asyncapi-split-test-${Date.now()}/asyncapi.yaml`;

    let result = await testUtils.cli(
      [inputFile, `-o ${outputFile}`, `--split`],
      "."
    );
    // console.log('result', result)
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("formatted successfully");
    expect(result.stdout).toContain("Output location:");

    // Verify the main file was created
    expect(fs.existsSync(outputFile)).toBe(true);

    // Verify split directories were created
    const outputDir = require("path").dirname(outputFile);
    expect(fs.existsSync(`${outputDir}/channels`)).toBe(true);
    expect(fs.existsSync(`${outputDir}/components`)).toBe(true);
  });
});

/**
 * Sanitize the output of the CLI
 * @param {string} str
 * @returns {*|string}
 */
function sanitize(str) {
  return str.replace(/^\s+|\s+$/g, "").trim();
}
