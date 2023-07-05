const functionRegExp = /@(\w+)\((.*)\)/g;

export async function handleFunctions(
    content: string,
    handle: (functionName: string, parameters: string[], line?: number, column?: number) => Promise<void>
): Promise<void> {
    await handleMatches(content, functionRegExp, async (match, line, column) => {
        const { functionName, parameters } = processMatchedFunction(match);

        await handle(functionName, parameters, line, column);
    });
}

export async function handleMatches(
    content: string,
    regExp: RegExp,
    handle: (match: RegExpMatchArray, line: number, column: number) => Promise<void>
) {
    const matches = matchAll(content, regExp);

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        const fragment = content.substring(0, match.index);
        const line = (fragment.match(/\n/g)?.length ?? 0) + 1;
        const column = fragment.length - fragment.lastIndexOf("\n");

        await handle(match, line, column);
    }
}

interface IFunctionMatch {
    match: RegExpMatchArray;
    functionName: string;
    parameters: string[];
}

export function matchAllFunctions(content: string): IFunctionMatch[] {
    const matches = matchAll(content, functionRegExp);
    const result: IFunctionMatch[] = [];

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const { functionName, parameters } = processMatchedFunction(match);

        result.push({
            match,
            functionName,
            parameters,
        });
    }

    return result;
}

export function matchAll(content: string, regExp: RegExp): RegExpMatchArray[] {
    const matchesIterator = content.matchAll(regExp);
    let match: IteratorResult<RegExpMatchArray, any>;
    const matches: RegExpMatchArray[] = [];

    while ((match = matchesIterator.next()).done !== true) {
        matches.push(match.value);
    }

    return matches;
}

function processMatchedFunction(match: RegExpMatchArray): {
    functionName: string;
    parameters: string[];
} {
    const functionName = match[1];
    const parameters = match[2].split(",").map((x) => x.trim());

    return { functionName, parameters };
}
