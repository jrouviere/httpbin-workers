import { createCors, Router, IRequest, withCookies } from 'itty-router';
import { v4 as uuidv4 } from 'uuid';

const router = Router<Request & IRequest>();

import index from './templates/httpbin.1.html';
import formPost from './templates/forms-post.html';
import moby from './templates/moby.html';
import utf8demo from './templates/UTF-8-demo.txt';

import sample_xml from './templates/sample.xml';

import image_png from './images/pig_icon.png';
import image_jpeg from './images/jackal.jpg';
import image_webp from './images/wolf_1.webp';
import image_svg from './images/svg_logo.svg';

import { renderTemplate, renderJSON, robots_txt, renderText, getDict, renderCompressedJSON, statusCode, redirect } from './helpers';

const { preflight, corsify } = createCors({
	maxAge: 3600,
	origins: ['*'],
	methods: ['GET, POST, PUT, DELETE, PATCH, OPTIONS'],
});

router.all('*', preflight);

router.all('*', (req) => {
	if (req.method == 'HEAD') {
		// unfortunately the HEAD method is a bit tricky to
		// implement properly with itty-router
		// TODO: maybe we could do a subrequest with a GET here
		return new Response();
	}
});

// use the /legacy template as our index
router.get('/', () => {
	return renderTemplate(index);
});

router.get('/legacy', () => {
	return renderTemplate(index);
});

router.get('/html', () => {
	return renderTemplate(moby);
});

router.get('/forms/post', () => {
	return renderTemplate(formPost);
});

router.get('/robots.txt', () => {
	return renderText(robots_txt);
});

router.get('/deny', () => {
	return renderText("YOU SHOULDN'T BE HERE");
});

router.get('/ip', (req) => {
	return renderJSON({
		origin: req.headers.get('CF-Connecting-IP'),
	});
});

router.get('/uuid', () => {
	return renderJSON({
		uuid: uuidv4(),
	});
});

router.get('/headers', (req) => {
	const headers = Object.fromEntries(req.headers);
	return renderJSON({ headers: headers });
});

router.get('/user-agent', (req) => {
	return renderJSON({
		'user-agent': req.headers.get('user-agent'),
	});
});

router.get('/get', async (req) => {
	return renderJSON(await getDict(req, ['url', 'args', 'headers', 'origin']));
});

router.all('/anything*', async (req) => {
	return renderJSON(await getDict(req, ['url', 'args', 'headers', 'origin', 'method', 'form', 'data', 'files', 'json']));
});

router.post('/post', async (req) => {
	return renderJSON(await getDict(req, ['url', 'args', 'form', 'data', 'origin', 'headers', 'files', 'json']));
});

router.put('/put', async (req) => {
	return renderJSON(await getDict(req, ['url', 'args', 'form', 'data', 'origin', 'headers', 'files', 'json']));
});

router.patch('/patch', async (req) => {
	return renderJSON(await getDict(req, ['url', 'args', 'form', 'data', 'origin', 'headers', 'files', 'json']));
});

router.delete('/delete', async (req) => {
	return renderJSON(await getDict(req, ['url', 'args', 'form', 'data', 'origin', 'headers', 'files', 'json']));
});

router.get('/gzip', async (req) => {
	let data = await getDict(req, ['origin', 'headers', 'method']);
	data.gzipped = true;

	return renderCompressedJSON(data, 'gzip');
});

router.get('/deflate', async (req) => {
	let data = await getDict(req, ['origin', 'headers', 'method']);
	data.deflated = true;

	return renderCompressedJSON(data, 'deflate');
});

router.get('/brotli', async (req) => {
	let data = await getDict(req, ['origin', 'headers', 'method']);
	data.brotli = true;

	return renderCompressedJSON(data, 'br');
});

router.all('/status/:codes', (req) => {
	const code = Number(req.params.codes);
	return statusCode(code);
});

router.get('/base64/:value', (req) => {
	try {
		const data = atob(req.params.value);
		return new Response(data);
	} catch {
		return new Response('Incorrect Base64 data try: SFRUUEJJTiBpcyBhd2Vzb21l');
	}
});

router.get('/encoding/utf8', () => {
	return renderTemplate(utf8demo);
});

router.all('/response-headers', (req) => {
	const hdr = Object.fromEntries(new URL(req.url).searchParams);
	if (!hdr['Content-Type']) {
		hdr['Content-Type'] = 'application/json';
	}

	// this loop is because the content-length is part of the
	// answer, making it self-referential
	let data = '';
	for (let i = 0; i < 5; i++) {
		data = JSON.stringify(hdr, null, 2) + '\n';
		hdr['Content-Length'] = data.length.toString();
	}

	return new Response(data, { headers: hdr });
});

router.get('/redirect/:n', (req) => {
	const count = Number(req.params.n);
	// const absoluteStr = new URL(req.url).searchParams.get("absolute") ?? "false";
	// const absolute = absoluteStr.toLowerCase() == "true";

	if (count == 1) {
		return redirect('/get');
	}
	return redirect('/relative-redirect/' + (count - 1).toString());
});

router.get('/relative-redirect/:n', (req) => {
	const count = Number(req.params.n);
	if (count <= 1) {
		return redirect('/get');
	}
	return redirect('/relative-redirect/' + (count - 1).toString());
});

router.all('/redirect-to', (req) => {
	const params = new URL(req.url).searchParams;

	let statusCode: number | undefined;
	let code = Number(params.get('status_code'));
	if (code >= 300 && code < 400) {
		statusCode = code;
	}

	return redirect(params.get('url') ?? '/', statusCode);
});

router.get('/cookies', withCookies, (req) => {
	return renderJSON({ cookies: req.cookies });
});

router.get('/cookies/set/:name/:value', (req) => {
	return new Response('', {
		status: 302,
		headers: {
			Location: '/cookies',
			'Set-Cookie': req.params.name + '=' + req.params.value + '; Path=/',
		},
	});
});

router.get('/cookies/set', (req) => {
	const params = new URL(req.url).searchParams;

	let hdr = new Headers({ Location: '/cookies' });
	for (let [k, v] of params) {
		hdr.append('Set-Cookie', k + '=' + v + '; Path=/');
	}
	return new Response('', {
		status: 302,
		headers: hdr,
	});
});

router.get('/cookies/delete', (req) => {
	const params = new URL(req.url).searchParams;

	let hdr = new Headers({ Location: '/cookies' });
	for (let [k, v] of params) {
		hdr.append('Set-Cookie', k + '=' + '; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
	}
	return new Response('', {
		status: 302,
		headers: hdr,
	});
});

router.get('/image', (req) => {
	const accept = req.headers.get('accept') ?? 'image/png';

	if (accept.includes('image/webp')) {
		return new Response(image_webp, { headers: { 'Content-Type': 'image/webp' } });
	}
	if (accept.includes('image/svg+xml')) {
		return new Response(image_svg, { headers: { 'Content-Type': 'image/svg+xml' } });
	}
	if (accept.includes('image/jpeg')) {
		return new Response(image_jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
	}
	if (accept.includes('image/png') || accept.includes('images/*')) {
		return new Response(image_png, { headers: { 'Content-Type': 'image/png' } });
	}

	return statusCode(406);
});

router.get('/image/png', (req) => {
	return new Response(image_png, { headers: { 'Content-Type': 'image/png' } });
});
router.get('/image/jpeg', (req) => {
	return new Response(image_jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
});
router.get('/image/webp', (req) => {
	return new Response(image_webp, { headers: { 'Content-Type': 'image/webp' } });
});
router.get('/image/svg', (req) => {
	return new Response(image_svg, { headers: { 'Content-Type': 'image/svg+xml' } });
});

router.get('/xml', (req) => {
	return new Response(sample_xml, { headers: { 'Content-Type': 'application/xml' } });
});

router.get('/json', (req) => {
	return renderJSON({
		slideshow: {
			title: 'Sample Slide Show',
			date: 'date of publication',
			author: 'Yours Truly',
			slides: [
				{ type: 'all', title: 'Wake up to WonderWidgets!' },
				{
					type: 'all',
					title: 'Overview',
					items: ['Why <em>WonderWidgets</em> are great', 'Who <em>buys</em> WonderWidgets'],
				},
			],
		},
	});
});

router.get('/cf/properties', (req) => {
	return renderJSON(req.cf);
});

router.all('*', () => {
	return new Response('Not Found.', { status: 404 });
});

export default {
	async fetch(request: Request) {
		return router.handle(request).then(corsify);
	},
};
