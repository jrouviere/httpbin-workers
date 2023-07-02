export const robots_txt = `User-agent: *
Disallow: /deny
`;

export function renderTemplate(tpl: string) {
    return new Response(tpl, {
        headers: {
            "Content-Type": "text/html; charset=utf-8"
        }
    });
}

export function renderText(txt: string) {
    return new Response(txt, {
        headers: {
            "Content-Type": "text/plain"
        }
    });
}

export function renderJSON(data: unknown) {
    return new Response(JSON.stringify(data, null, 2), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}

export function renderCompressedJSON(data: unknown, compression: "gzip" | "deflate" | "br") {
    return new Response(JSON.stringify(data, null, 2), {
        encodeBody: "automatic",
        headers: {
            "Content-Type": "application/json",
            "Content-Encoding": compression,
        }
    });
}

export async function getDict(req: Request, fields: string[]) {

    let form: Record<string, string> = {};
    let files: Record<string, string> = {};
    let data = "";
    let json = null;

    switch (req.headers.get("Content-Type")) {
        // This is slightly weird but that seems to be
        // the default behaviour of httpbin.
        case "application/json":
        case "text/plain":
            try {
                data = await req.text();
                json = JSON.parse(data);
            } catch (e) { }
            break;

        case "multipart/form-data":
        case "application/x-www-form-urlencoded":
        default:
            try {
                let fd = await req.formData();
                for (const [k, v] of fd) {
                    if (typeof v === "string") {
                        form[k] = v;
                    } else {
                        files[k] = await v.text();
                    }
                }
            } catch (e) { }
            break;

    }


    const all = {
        args: Object.fromEntries(new URL(req.url).searchParams),
        data: data,
        files: files,
        form: form,
        headers: Object.fromEntries(req.headers),
        json: json,
        method: req.method,
        origin: req.headers.get("X-Forwarded-For"),
        url: req.url,
    };

    // only keep the fields requested
    const keep = new Set(fields);
    return Object.fromEntries(
        Object.entries(all).filter(
            ([key]) => keep.has(key)
        )
    );
}

const ACCEPTED_MEDIA_TYPES = [
    'image/webp',
    'image/svg+xml',
    'image/jpeg',
    'image/png',
    'image/*'
];

export function statusCode(code: number) {
    const redirect: [string, HeadersInit?] = ["", { "Location": "/redirect/1" }];

    const codeMap = new Map<number, [string, HeadersInit?]>([
        [301, redirect],
        [302, redirect],
        [303, redirect],
        [304, ["", undefined]],
        [305, redirect],
        [307, redirect],
        [401, ["", { 'WWW-Authenticate': 'Basic realm="Fake Realm"' }]],
        [402, ["Fuck you, pay me!", { 'x-more-info': 'http://vimeo.com/22053820' }]],
        [406, [JSON.stringify({
            'message': 'Client did not request a supported media type.',
            'accept': ACCEPTED_MEDIA_TYPES
        }), { 'Content-Type': 'application/json' }]],
        [407, ["", { 'Proxy-Authenticate': 'Basic realm="Fake Realm"' }]],
        [418, ["I'm a teapot!", { 'x-more-info': 'http://tools.ietf.org/html/rfc2324' }]],
    ]);

    let data = codeMap.get(code);
    if (!data) {
        return new Response("", { status: code });
    }

    let [body, headers] = data;
    return new Response(body, {
        status: code,
        headers: headers,
    });
}

export function redirect(url: string, code: number = 302) {
    return new Response("", {
        status: code,
        headers: {
            "Location": url,
        },
    });
}