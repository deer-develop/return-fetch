"use client";

import React from "react";
import { marked } from "marked";
import MarkdownRenderer from "@/app/components/MarkdownRenderer";
import Button from "@/app/components/Button";
import returnFetch from "return-fetch";
import { strings } from "@/app/common/strings";

export const basicExampleCode = `
\`\`\`ts
import returnFetch from "return-fetch";

const fetchExtended = returnFetch({
  baseUrl: "https://jsonplaceholder.typicode.com",
  headers: { Accept: "application/json" },
  interceptors: {
    request: async (args) => {
      console.log("********* before sending request *********");
      console.log("url:", args[0].toString());
      console.log("requestInit:", args[1], "\\n\\n");
      return args;
    },

    response: async (response, requestArgs) => {
      console.log("********* after receiving response *********");
      console.log("url:", requestArgs[0].toString());
      console.log("requestInit:", requestArgs[1], "\\n\\n");
      return response;
    },
  },
});

fetchExtended("/todos/1", { method: "GET" })
  .then((it) => it.text())
  .then(console.log);
\`\`\`
`;

const logs: string[] = [];
const headersToJson = (headers: Headers) => {
  const entries = [...headers.entries()];
  return Object.fromEntries(entries);
};

const fetchExtended = returnFetch({
  baseUrl: "https://jsonplaceholder.typicode.com",
  headers: { Accept: "application/json" },
  interceptors: {
    request: async (args) => {
      logs.length = 0;
      logs.push("********* before sending request *********");
      logs.push(`url: "${args[0]}"`);
      logs.push(
        `requestInit: ${JSON.stringify(
          { ...args[1], headers: headersToJson(args[1]?.headers as Headers) },
          null,
          2,
        )}\n\n`,
      );
      return args;
    },

    response: async (response, requestArgs) => {
      logs.push("********* after receiving response *********");
      logs.push(`url: "${requestArgs[0]}"`);
      logs.push(
        `requestInit: ${JSON.stringify(
          {
            ...requestArgs[1],
            headers: headersToJson(requestArgs[1]?.headers as Headers),
          },
          null,
          2,
        )}\n\n`,
      );
      return response;
    },
  },
});

const BasicExample = (): React.JSX.Element => {
  const [output, setOutput] = React.useState(`\`\`\`json
${strings.clickRunButton}
\`\`\``);

  return (
    <div>
      <MarkdownRenderer markdown={basicExampleCode} />
      <div className={"mb-2"}>
        <Button
          onClick={() => {
            setOutput(`\`\`\`\nLoading...\n\`\`\``);
            fetchExtended("/todos/1", { method: "GET" })
              .then((it) => it.text())
              .then((it) => {
                logs.push("**** received response ****");
                logs.push(it);
                setOutput(`\`\`\`json\n${logs.join("\n")}\n\`\`\``);
              });
          }}
        >
          Run
        </Button>
      </div>
      <strong>Output</strong>
      <div dangerouslySetInnerHTML={{ __html: marked(output) }} />
      <p>
        To see how powerful it is,{" "}
        <a
          href={
            "#4-compose-above-three-high-order-functions-to-create-your-awesome-fetch-"
          }
        >
          go to an example composing multiple customized{" "}
          <code>returnFetch</code>.
        </a>
      </p>
    </div>
  );
};

export default BasicExample;
