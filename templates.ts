import { AMRGraph } from "./deps.ts";

export interface QueryTemplate {
  graph: AMRGraph;
  id?: string;
  path?: string;
}

export type QueryTemplateEntry = {
  [key: string]: QueryTemplate[];
} | QueryTemplate[];

const queryTemplates: { [key: string]: QueryTemplateEntry } = {
  "behaviors": {
    "receiveHi": [
      {
        graph: { h: [[":instance", "hi"]] },
      },
    ],
    "receiveGoodbye": [
      {
        graph: { g: [[":instance", "goodbye"]] },
      },
    ],
    "receiveGenAsk": [
      {
        graph: { a: [[":instance", "amr-unknown"]] },
      },
    ],
    "receiveSomeoneName": [
      {
        graph: {
          n: [[":instance", "name-01"], [":ARG1", "ii"], [":ARG2", "p"]],
          ii: [[":instance", "i"]],
          p: [[":instance", "person"], [":name", "n2"]],
          n2: [[":instance", "name"]],
        },
        id: "n2",
      },
    ],
  },
  "commands": {},
  "informational": {
    "receiveNames": [
      {
        graph: { n: [[":instance", "name"]] },
      },
    ],
    "who": [
      {
        graph: {}, //TODO
      },
    ],
    "what": [
      {
        graph: {}, //TODO
      },
    ],
    "when": [
      {
        graph: {
          a: [[":instance", "amr-unknown"], [":time", "a2"]],
          a2: [[":instance", "amr-unknown"]],
        },
        id: "a2",
      },
    ],
    "where": [
      {
        graph: {
          a: [[":instance", "amr-unknown"], [":location", "a2"]],
          a2: [[":instance", "amr-unknown"]],
        },
        id: "a2",
      },
    ],
    "why": [
      {
        graph: {
          a: [[":instance", "amr-unknown"], [":cause", "a2"]],
          a2: [[":instance", "amr-unknown"]],
        },
        id: "a2",
      },
    ],
  },
};

export { queryTemplates };
