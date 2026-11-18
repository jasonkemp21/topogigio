# Topo Gigio website concept

A redesign concept for Topo Gigio Ristorante (1516 N Wells St, Chicago), built by Jason Kemp to show the restaurant what its site could be.

**This is not the restaurant's live site.** Nothing here takes an order or a payment. Every page carries a "Concept site, not live" label, and the page asks search engines not to index it.

## What's in it

- A home page that says whether the restaurant is open right now, with the house dishes, the garden, the private room and how to get there
- The dinner, lunch and drinks menus as searchable text, with gluten-free, vegetarian and pescatarian filters
- A Reserve panel that asks for a date, time and party size and opens the restaurant's OpenTable page with those filled in
- Private events, catering and gift card pages, each with a request form
- A staff portal (the Staff link in the footer) that lists everyone who sent a request, with a status, notes and their history
- Pitch notes (the button on the concept label) covering the current site's problems, what changed, what the design is modeled on, a build plan and open questions

## What is real and what is simulated

- **Real:** the menus and prices, hours, address, policies, story and awards, all taken from topogigiochicago.com as it read on November 17, 2026. Misspellings were corrected and are listed in the pitch notes. The photos are the restaurant's own.
- **Simulated:** banquet inquiries, catering requests, gift card requests and messages. They are kept in the browser that made them and go nowhere else. The staff portal starts with six people tagged Sample.
- **Live links:** the OpenTable button opens the restaurant's real OpenTable page in a new tab. A table booked there is a real reservation. Phone and email links are the restaurant's real ones.

## Run it

It is one static page. Open `index.html`, or serve the folder:

```
npx serve .
```

## Change it

The page is assembled from `src/`:

```
src/css/    styles, in load order
src/html/   page sections, in load order
src/js/     menu data, restaurant facts, routing, rendering, staff portal, forms
build.mjs   joins them into index.html
```

After editing anything in `src/`:

```
node build.mjs
```

`tools/menu.py` and `tools/patch.py` generated `src/js/00-menu.js` from saved copies of the restaurant's menu pages. Those copies are not in this repo.

## Test it

The tests drive a real browser and need Playwright (`npm i -D playwright && npx playwright install chromium`).

```
node test/flows.mjs            # open-or-closed logic, menu filters, reserve panel, every form, the portal
node test/crawl.mjs desktop    # clicks every link and button and reports any that do nothing
node test/crawl.mjs phone
node test/shots.mjs            # screenshots of every page at laptop and phone width
```

## Credits

The photos, the name and the menu belong to Topo Gigio Ristorante and are used here only to show the restaurant its own content in a new layout. The restaurant's logo and the Topo Gigio character are not used. Type is Besley and Libre Franklin, loaded from Google Fonts.
