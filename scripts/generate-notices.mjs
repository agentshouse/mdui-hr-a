import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const donorCommit = "2352eb5b6539e2f39ad9aef652279ad1dcf2c467";
const donorLicenseHash =
  "ae616936d77df09838b97cb6d4a41921bcd47b676fe9ce623a5ee4cdbb1db91f";
const separator = "\n" + "=".repeat(80) + "\n";
const supplementalLicenses = [
  {
    names: ["@cfworker/json-schema"],
    version: "4.1.1",
    file: "licenses/cfworker-json-schema-MIT.txt",
    source:
      "https://github.com/cfworker/cfworker/blob/5409fdc2bd144f68e8b28c61c71fcb16600000a6/LICENSE.md",
    sha256: "376944252ab78ca6b41aee44ddea8894927ee67891e77e61eb9d59af63e35094",
    provenance:
      "Original upstream license from the package publication commit.",
  },
  {
    names: ["remark-parse"], version: "9.0.0",
    file: "licenses/remark-parse-MIT.txt",
    source: "https://github.com/remarkjs/remark/blob/remark-parse%409.0.0/license",
    sha256: "50b4b8729371c8224f2178cb293b438da44763ac98447e2f184231339dc46c78",
    provenance: "Original upstream license from the exact remark-parse 9.0.0 release tag.",
  },
  {
    names: ["inline-style-parser"], version: "0.1.1",
    file: "licenses/inline-style-parser-MIT.txt",
    source: "https://github.com/reworkcss/css/blob/v2.2.4/LICENSE",
    sha256: "395c95f20598da653ff1eb1cb9d74947c7fac689697147f1d192fd0242a0e635",
    provenance: "Original upstream grant explicitly linked by inline-style-parser 0.1.1's distributed README license section.",
  },
  {
    names: ["@mui/x-virtualizer"], version: "0.4.2",
    file: "licenses/mui-x-virtualizer-MIT.txt",
    source: "https://github.com/mui/mui-x/blob/a20b5b659300b6b5ebadd3555796ba76a521a8b6/packages/x-virtualizer/LICENSE",
    sha256: "619b16f56e57883d2213612363fa2faa6f5b43ec9e73b5009cbac8f7001e94aa",
    provenance: "Package declares MIT but omits its root grant. Upstream PR #22164 adds this package-specific MIT grant, explicitly resolving missing-license issue #22150; exact merged commit retained.",
  },
];

// Keep published license identifiers and full distributed notices intact. Do not
// infer a license grant from the application's or another package's MIT license.
export function collectNotices() {
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
  );
  const donorLicense = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
  assert.equal(
    createHash("sha256").update(donorLicense).digest("hex"),
    donorLicenseHash,
    "Pinned donor MIT notice changed",
  );
  const parts = [
    "THIRD-PARTY NOTICES\n\nHR includes modified software and assets from refinedev/refine,\n" +
      `examples/refine-hr-ce at commit ${donorCommit}. The donor MIT\n` +
      "notice is retained below. Locally installed fonts carry their own notices.\n\n" +
      "The dependency notices cover the installed production dependency closure\n" +
      "in package-lock.json, a superset of packages actually bundled. Development\n" +
      "build/test tools are not shipped and are not included. Published license\n" +
      "identifiers and full distributed notices are retained without inventing\n" +
      "missing permission.\n\n" +
      "Each package's published license grant is retained below.\n",
    separator +
      "Donor: refinedev/refine examples/refine-hr-ce\n" +
      `Source: https://github.com/refinedev/refine/tree/${donorCommit}/examples/refine-hr-ce\n` +
      `Commit: ${donorCommit}\nLicense identifier: MIT\n\n` +
      donorLicense,
  ];
  const packages = [];
  const missingLicenseFiles = [];
  const supplementalLicenseFiles = [];
  const licenseGaps = [];
  const errors = [];
  const supplements = {};
  const fontLicenses = {};
  for (const [relative, entry] of Object.entries(lock.packages).sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    if (!relative || entry.dev) continue;
    const directory = path.join(root, relative);
    const manifest = path.join(directory, "package.json");
    if (!fs.existsSync(manifest)) {
      if (!entry.optional)
        errors.push(
          `Required production package is not installed: ${relative}`,
        );
      continue;
    }
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    assert.equal(
      pkg.version,
      entry.version,
      `Installed version differs from lockfile: ${relative}`,
    );
    assert(!/^@mui\/x-(?:license(?:-pro)?|.*-(?:pro|premium))$/.test(pkg.name),
      `Commercial MUI dependency must not enter HR's production closure: ${pkg.name}`);
    const identifier =
      typeof pkg.license === "string"
        ? pkg.license
        : (pkg.license || pkg.licenses ? JSON.stringify(pkg.license ?? pkg.licenses) : "Not declared");
    const licenseFiles = fs
      .readdirSync(directory)
      .filter(
        (file) =>
          /^(licen[cs]e|copying|copyright|notice|ofl)(?:[.\-_]|$)/i.test(
            file,
          ) && fs.statSync(path.join(directory, file)).isFile(),
      )
      .sort();
    const item = { name: pkg.name, version: pkg.version, license: identifier };
    packages.push(item);
    parts.push(
      separator +
        `${pkg.name} ${pkg.version}\nLicense identifier: ${identifier}\nInstalled path: ${relative}\n`,
    );
    if (!licenseFiles.length) {
      parts.push(
        "\nNo license or notice file was distributed at the package root.\n",
      );
      const supplementalLicense = supplementalLicenses.find(
        (item) => item.names.includes(pkg.name) && item.version === pkg.version,
      );
      if (supplementalLicense) {
        const contents = fs.readFileSync(
          path.join(root, "public", supplementalLicense.file),
          "utf8",
        );
        assert.equal(
          createHash("sha256").update(contents).digest("hex"),
          supplementalLicense.sha256,
          "Supplemental upstream license text changed",
        );
        supplements[supplementalLicense.file] = contents;
        supplementalLicenseFiles.push({ ...item, file: supplementalLicense.file, source: supplementalLicense.source, sha256: supplementalLicense.sha256 });
        parts.push(
          `\n${supplementalLicense.provenance}\nSource: ${supplementalLicense.source}\n\n${contents}`,
        );
      } else {
        missingLicenseFiles.push(item);
        errors.push(
          `Missing distributed license text: ${pkg.name} ${pkg.version}`,
        );
      }
    }
    if (/^(UNLICENSED|Not declared)$/i.test(identifier)) {
      licenseGaps.push(item);
      errors.push(`Unresolved license grant: ${pkg.name} ${pkg.version}`);
    }
    for (const file of licenseFiles) {
      const contents = fs.readFileSync(path.join(directory, file), "utf8");
      parts.push(`\n--- ${file} ---\n\n${contents}\n`);
      if (pkg.name?.startsWith("@fontsource/") && /SIL OPEN FONT LICENSE/i.test(contents))
        fontLicenses[`licenses/${pkg.name.split("/")[1]}-OFL.txt`] = contents;
    }
  }

  assert.equal(errors.length, 0, errors.join("\n"));
  return {
    files: {
      "LICENSE.txt": donorLicense,
      "THIRD_PARTY_NOTICES.txt": parts.join(""),
      ...fontLicenses,
      "licenses/PROVENANCE.txt": fs.readFileSync(
        path.join(root, "public/licenses/PROVENANCE.txt"),
        "utf8",
      ),
      ...supplements,
    },
    packages,
    missingLicenseFiles,
    supplementalLicenseFiles,
    licenseGaps,
  };
}

export function generateNotices({ check = false } = {}) {
  const result = collectNotices();
  for (const [relative, contents] of Object.entries(result.files)) {
    const destination = path.join(root, "public", relative);
    if (check)
      assert.equal(
        fs.readFileSync(destination, "utf8"),
        contents,
        `Stale or incomplete notice: ${relative}`,
      );
    else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, contents);
    }
  }
  return {
    packages: result.packages.length,
    missingLicenseFiles: result.missingLicenseFiles,
    supplementalLicenseFiles: result.supplementalLicenseFiles,
    licenseGaps: result.licenseGaps,
    redistributionStatus: result.licenseGaps.length
      ? "Unresolved license/attribution gaps; technical checks do not establish redistribution permission."
      : "No declared license gaps detected; not a legal opinion.",
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    JSON.stringify(
      generateNotices({ check: process.argv.includes("--check") }),
      null,
      2,
    ),
  );
}
