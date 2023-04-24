/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

/*
Reification:
x :Relation y = x :Domain-of (z / Reification :Range y)
EX:
x :location y = x :ARG0-of (b / be-located-at-91 :ARG1 y)
*/
import {
  AMRGraph,
  AMRUtils,
  and,
  anyo,
  eq,
  ImmutableMap,
  LVar,
  lvar,
  membero,
  not,
  or,
  walk,
} from "./deps.ts";

import { QueryCore, SearchOps } from "./query_core.ts";
import { QueryTemplate, QueryTemplateEntry } from "./templates.ts";
export type { QueryTemplate, QueryTemplateEntry, SearchOps };
export { QueryCore };

export class AMRQuery {
  #core: QueryCore;
  constructor(
    graph: AMRGraph,
    ops: SearchOps = {},
    startId: string = "",
  ) {
    if (startId) {
      graph = (new AMRUtils()).subGraphAt(graph, startId);
    }
    this.#core = new QueryCore(graph, ops);
  }
  async initWordnet(path: string = "./wordnet.data") {
    await QueryCore.initWordnet(path);
  }
  get graph(): AMRGraph {
    return this.#core.graph;
  }
  get core() {
    return this.#core;
  }
}
