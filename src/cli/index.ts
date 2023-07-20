import { getAllEnvironments } from "./environmentsCLIController";
import { getAllFeatures } from "./featuresCLIController";
import { getAllVariables } from "./variablesCLIController";

export * from "./baseCLIController";
export * from "./featuresCLIController";
export * from "./variablesCLIController";
export * from "./environmentsCLIController";


export const initStorage = async () => {
    await Promise.all([
        getAllVariables(),
        getAllFeatures(),
        getAllEnvironments(),
    ]);
}
