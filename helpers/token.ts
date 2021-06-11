export function getTokenFromHeader(header: string): string {
    return header.replace(/(Basic|Bearer)\s/,"");
}