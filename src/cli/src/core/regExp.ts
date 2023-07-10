export async function handleAllMatches(
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

export function matchAll(content: string, regExp: RegExp): RegExpMatchArray[] {
    const matchesIterator = content.matchAll(regExp);
    let match: IteratorResult<RegExpMatchArray, any>;
    const matches: RegExpMatchArray[] = [];

    while ((match = matchesIterator.next()).done !== true) {
        matches.push(match.value);
    }

    return matches;
}
