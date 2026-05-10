import { kmeans } from "ml-kmeans";

declare module 'ml-kmeans' {
  export type InitializationMethod = 'kmeans++' | 'random' | 'mostDistant';

  export interface Options {
    distanceFunction?: (p: number[], q: number[]) => number;
    tolerance?: number;
    initialization?: InitializationMethod | number[][];
    maxIterations?: number;
    seed?: number;
  }

  export declare class KMeansResult {
    clusters: number[];
    centroids: number[][];
    converged: boolean;
    iterations: number;
    nearest(data: number[][]): number[];
  }

  export function kmeans(data: number[][], K: number, options?: Options): KMeansResult;
}
