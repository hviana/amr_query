/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import {
  AMRGraph,
  AMRUtils,
  and,
  conso,
  eq,
  fail,
  ImmutableMap,
  IsJoinableFunc,
  LVar,
  lvar,
  membero,
  not,
  or,
  run,
  ScoreFunc,
  ScoreResult,
  SearchFunc,
  succeed,
  walk,
  WordClass,
  Wordnet,
} from "./deps.ts";

import {
  QueryTemplate,
  QueryTemplateEntry,
  queryTemplates,
} from "./templates.ts";

export type SearchOps = {
  minScore?: number;
  cutRate?: number;
};

export const defaultSearchOps: SearchOps = {
  minScore: 0,
  cutRate: 0.5,
};

export class QueryCore {
  #graph: AMRGraph;
  #ops: SearchOps;
  constructor(graph: AMRGraph, ops: SearchOps = {}) {
    this.#ops = { ...defaultSearchOps, ...ops };
    this.#graph = graph;
  }
  static #utils: AMRUtils = new AMRUtils();
  static #wordNet: { [key: string]: Function } = {};
  static #wordNetInitialized: boolean = false;
  static async initWordnet(path: string = "./wordnet.data") {
    if (QueryCore.#wordNetInitialized) {
      return;
    }
    const wordnet = new Wordnet();
    await wordnet.init(path);
    QueryCore.#wordNet = wordnet.logic(); //get logic functions
    QueryCore.#wordNetInitialized = true;
  }
  static get wordNet() {
    return QueryCore.#wordNet;
  }
  static get utils() {
    return this.#utils;
  }
  static get templates() {
    return queryTemplates;
  }
  static detetectInstanceWordClass(nodeId: string): WordClass {
    return "n"; //TODO
  }
  static runY(
    func: Function,
    solutions = Number.MAX_SAFE_INTEGER,
  ) { // move to logic.ts
    const y = lvar("y");
    const results = run(solutions, [y], func(y));
    return [...new Set(results.map((s: any) => s.y))];
  }
  get graph() {
    return this.#graph;
  }
  get nodes(): string[] {
    return Object.keys(this.#graph);
  }
  //glue function
  sentences(
    result: LVar,
  ): (sMap: ImmutableMap) => Generator<ImmutableMap | null> {
    const results: string[] = [];
    const nodes = QueryCore.utils.search(
      this.#graph,
      "multi-sentence",
      "",
      "",
      undefined,
      true,
    );
    for (const n of nodes) {
      results.push(
        ...QueryCore.utils.childsOf(this.#graph, n, undefined, true),
      );
    }
    if (results.length === 0) {
      results.push(QueryCore.utils.rootId(this.#graph));
    }
    return function* (sMap: ImmutableMap): Generator<ImmutableMap | null> {
      yield* membero(result, results)(sMap);
    };
  }

  //glue function
  search(
    path: LVar | string,
    top: boolean = false,
    result: LVar,
  ): (sMap: ImmutableMap) => Generator<ImmutableMap | null> {
    const selfInstance = this;
    return function* (sMap: ImmutableMap): Generator<ImmutableMap | null> {
      path = walk(path, sMap);
      const templatesArr = selfInstance.#templatesFrom(path as string);
      const results = selfInstance.#searchPatternArr(templatesArr, top);
      //The logical predicate "membero" must explore the vector in order,
      //starting from index 0 and going to N, for the correct functioning of the algorithm.
      yield* membero(result, results)(sMap);
    };
  }

  //use KG
  static isJoinableFunc = (
    id1: string,
    id2: string,
    graph: AMRGraph,
    utils: AMRUtils,
  ) => {
    var res: boolean = AMRUtils.defaultIsJoinableFunc(
      id1,
      id2,
      graph,
      utils,
    );
    if (!res) {
      const instance1 = utils.instanceOf(graph, id1);
      const instance2 = utils.instanceOf(graph, id2);
      if (instance1 !== instance2) { //to not consider 'notJoinableEntities' param
        if (QueryCore.hasSynsetInCommon(instance1, instance2)) {
          res = true;
        }
      }
    }
    return res;
  };

  //use KG
  scoreFunc = (
    id1: string,
    id2: string,
    graph: AMRGraph,
    patternGraph: AMRGraph,
    utils: AMRUtils,
  ) => {
    var res: number = AMRUtils.defaultScoreFunc(
      id1,
      id2,
      graph,
      patternGraph,
      utils,
    );
    if (res === 0) {
      const instance1 = utils.instanceOf(graph, id1);
      const instance2 = utils.instanceOf(patternGraph, id2);
      if (
        QueryCore.hasSynsetInCommon(
          instance1,
          instance2,
        )
      ) {
        res = 0.75;
      }
    }
    return res;
  };

  static hasSynsetInCommon(instance1: string, instance2: string): boolean {
    const word1 = QueryCore.utils.possibleWordFromInstance(instance1);
    const word2 = QueryCore.utils.possibleWordFromInstance(instance2);
    const synsets1 = QueryCore.runY((y: any) =>
      QueryCore.wordNet.lemmas(y, word1)
    );
    const synsets2 = QueryCore.runY((y: any) =>
      QueryCore.wordNet.lemmas(y, word2)
    );
    for (const s of synsets1) {
      if (synsets2.includes(s)) {
        return true;
      }
    }
    return false;
  }

  #searchPatternArr(
    templatesArr: QueryTemplate[],
    top: boolean = false,
  ): string[] {
    const res: any[] = [];
    for (const t of templatesArr) {
      const templateResults: ScoreResult[] = QueryCore.utils.searchPattern(
        this.graph,
        t.graph,
        t.id || QueryCore.utils.rootId(t.graph),
        true,
        this.scoreFunc,
      ) as ScoreResult[];
      for (const r of templateResults) {
        if (r.score >= this.#ops.minScore!) {
          res.push({ ...r, ...{ path: `${t.path}.${r.id}` } });
        }
      }
    }
    res.sort((a: ScoreResult, b: ScoreResult) => {
      return (a.score > b.score) ? -1 : ((b.score > a.score) ? 1 : 0);
    });
    //[...new set(Arr)] maintains the order, in addition to leaving
    //the first occurrence and removing the next ones, starting from index 0 and going to N.
    //order is important for logical predicates to explore the most
    //higher probability occurrences first
    if (top) {
      return [res[0].path];
    }
    return [
      ...new Set(
        res.filter((r) => (r.score / res[0].score) >= this.#ops.cutRate!).map((
          r,
        ) => r.id),
      ),
    ];
  }

  #templatesFrom(path: string = ""): QueryTemplate[] { //path notation
    if (path === "") {
      const res: QueryTemplate[] = [];
      for (const key in QueryCore.templates) {
        res.push(...this.#templatesArr(QueryCore.templates[key], key));
      }
      return res;
    } else {
      //@ts-ignore
      const entry = path.split(".").reduce(
        //@ts-ignore
        (o, key) => typeof o === "object" && key in o ? o[key] : undefined,
        QueryCore.templates,
      ) as QueryTemplateEntry;
      return this.#templatesArr(entry, path);
    }
  }

  #templatesArr(entry: QueryTemplateEntry, path: string): QueryTemplate[] {
    if (Array.isArray(entry)) {
      for (const e of entry) {
        e.path = path;
      }
      return entry;
    } else {
      const res: QueryTemplate[] = [];
      for (const key in entry) {
        res.push(...this.#templatesArr(entry[key], `${path}.${key}`));
      }
      return res;
    }
  }
}
