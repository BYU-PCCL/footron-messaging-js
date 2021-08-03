// Based on https://github.com/BYU-PCCL/footron-controls-client/blob/12e65fe1a02bafd1c83c196245c0f66bdfd5738d/rollup.config.js
import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";
import size from "rollup-plugin-size";
import externalDeps from "rollup-plugin-peer-deps-external";
import resolve from "rollup-plugin-node-resolve";
import commonJS from "rollup-plugin-commonjs";
import replace from "@rollup/plugin-replace";

const inputSrcs = [["src/index.ts", "FootronMessaging", "footron-messaging"]];

const extensions = [".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx"];
const babelConfig = { extensions, runtimeHelpers: true };
const resolveConfig = { extensions };

export default inputSrcs
  .map(([input, name, file]) => {
    return [
      {
        input: input,
        output: {
          name,
          file: `dist/${file}.development.js`,
          format: "umd",
          sourcemap: true,
        },
        plugins: [
          resolve(resolveConfig),
          babel(babelConfig),
          commonJS(),
          externalDeps(),
        ],
      },
      {
        input: input,
        output: {
          name,
          file: `dist/${file}.production.min.js`,
          format: "umd",
          sourcemap: true,
        },
        plugins: [
          replace({
            "process.env.NODE_ENV": `"production"`,
            delimiters: ["", ""],
            preventAssignment: true,
          }),
          resolve(resolveConfig),
          babel(babelConfig),
          commonJS(),
          externalDeps(),
          terser(),
          size(),
        ],
      },
    ];
  })
  .flat();
