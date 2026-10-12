# Web Platform Features Supported by Chrome and Safari

Generated from web-features 3.42.0 and @mdn/browser-compat-data 8.1.5.

Total features: **1214** — Chrome and Safari: **870**, Chrome only: **230**, Safari only: **39**, neither: **75**.

Chrome and Safari versions and support groups come from the WebDX feature dataset, which incorporates browser-compat-data. Where a feature has no specific version, the generator checks BCD compatibility keys; “Yes” means support is recorded without a version.

## Chrome + Safari (870)

| Feature | Chrome | Safari | Baseline | Summary |
| --- | --- | --- | --- | --- |
| <a> | 1 | 1 | widely | The <a> element creates a hyperlink to any resource that's accessible via a URL, such as web pages, files, email addresses, or locations within the same page. |
| <abbr> | 2 | 4 | widely | The <abbr> HTML element represents an abbreviation or acronym. |
| Abortable fetch | 66 | 12.1 | widely | If you construct a fetch request with an AbortSignal, you can cancel the request. |
| AbortController and AbortSignal | 66 | 12.1 | widely | The AbortController and AbortSignal APIs allow you to cancel an ongoing operation, such as a fetch() request. |
| AbortSignal.any() | 116 | 17.4 | widely | The AbortSignal.any() static method combines an iterable of abort signals into a single signal, with the abort reason taken from the first signal to abort. |
| AbortSignal.timeout() | 124 | 16 | newly | The AbortSignal.timeout() static method returns an abort signal that automatically aborts after a specified duration. |
| abs() and sign() | 138 | 15.4 | newly | The abs() and sign() CSS functions compute the absolute value or the sign of the input. |
| Absolute positioning | 1 | 1 | widely | The position: absolute CSS declaration removes an element from the normal flow and positions it relative to its containing block, which is often the root element, or closest positioned ancestor. |
| accent-color | 93 | 26.2 | limited | The accent-color CSS property sets a color for checkboxes, radio buttons, and other form controls. |
| accesskey | 17 | 6 | widely | The accesskey global HTML attribute gives a hint for generating a keyboard shortcut for the current element. The attribute value must consist of a single printable character. |
| Accessor methods | 1 | 3 | limited | The __defineGetter__() and __defineSetter__() methods of objects bind a function to a property, which is called on setting or reading the property. |
| Active view transition | 125 | 18.2 | newly | The :active-view-transition CSS pseudo-class matches the root element when a view transition is active. The :active-view-transition-type() CSS pseudo-class matches only when the active view transition was started with the specified type. |
| <address> | 1 | 1 | widely | The <address> element represents contact information for a person or people, or for an organization. |
| Alerts | 1 | 1 | widely | The window.alert(), window.confirm(), and window.prompt() methods open modal dialogs for notifying the user, asking for confirmation, or entering text. |
| align-content in block layouts | 123 | 17.4 | newly | The align-content property vertically aligns content in block layouts, like it does in flex or grid layouts. |
| alignment-baseline | 1 | 5.1 | limited | The alignment-baseline CSS property sets which baseline of an element is aligned with the corresponding baseline of its parent. |
| all | 37 | 9.1 | widely | The all CSS property is a shorthand for all CSS properties, except for direction and unicode-bidi. It accepts only the keywords for explicit defaulting (such as initial and inherit), since they are the only values supported on all CSS properties. |
| alpha() | 151 | 27 | newly | The alpha() CSS function computes a relative color value by adjusting the opacity of an origin color. |
| Alt text for generated content | 77 | 17.4 | newly | The / notation in content CSS property values adds alternative text to generated content. For example, the content: url('upvote-icon.svg') / 'Upvote' declaration adds accessible 'Upvote' text to the SVG icon. Also known as alternate text. |
| Anchor positioning animations and transitions | 125 | 26 | limited | The anchor() and anchor-size() CSS functions animate or transition on changes such as the anchor box moving or the anchor element changing. |
| Anchor positioning transforms | 144 | 27 | limited | Anchor positioned elements take CSS transforms on their anchor elements into account. |
| ANGLE_instanced_arrays WebGL extension | 32 | 8 | widely | The ANGLE_instanced_arrays extension for WebGL 1.0 contexts draws the same object multiple times or groups of similar objects multiple times, if the group shares the same vertex data, primitive count and type. |
| animation-composition | 112 | 16 | widely | The animation-composition CSS property chooses how to combine animations that affect the same property. |
| Animations (CSS) | 43 | 9 | widely | The animation CSS property animates an element's style over time, using keyframes described in @keyframes rules. |
| Animation accessors | 151 | 27 | newly | The animation property of an AnimationEvent or TransitionEvent object is the Animation object that represents the animation (and thus the element) that fired an animation event. |
| Application shortcuts | 96 | 17.4 | limited | The shortcuts web app manifest member registers common actions of an installed web app with the device. The device can present these actions to the user in contextually appropriate locations, such as jump lists on Windows or the app launcher on Android. |
| appearance | 84 | 15.4 | widely | The appearance CSS property controls the appearance of form controls. Using appearance: none disables any default native appearance and allows the elements to be styled with CSS. |
| arguments.callee | 1 | 1 | limited | The callee property of the arguments variable in a non-strict function body's local scope is the function that arguments belongs to. |
| ARIA attribute reflection | 103 | 16.4 | widely | WAI-ARIA attributes have corresponding properties on Element and ElementInternals objects. |
| ariaNotify() | 141 | 27 | newly | The ariaNotify() method of Element and Document requests assistive technology software, if activated, to announce a message to the user. This can help make dynamic content changes more accessible to users. |
| Array (initial support) | 1 | 1 | widely | Arrays are ordered lists of JavaScript values. |
| Array at() | 92 | 15.4 | widely | The at() method of arrays and typed arrays returns the item at an index, including negative indices for getting items relative to the end of an array. Also known as the relative indexing method. |
| Array by copy | 110 | 16 | widely | The toReversed(), toSorted(), toSpliced(), and with() methods of arrays and typed arrays return changed copies of arrays. They stand in contrast to methods such as sort() or reverse() that change arrays in place. |
| Array copyWithin() | 45 | 10 | widely | The copyWithin() method of arrays and typed arrays shifts or copies items of an array to another index of the array without changing its length. |
| Array fill() | 45 | 10 | widely | The fill() method of arrays and typed arrays sets all or some items of an array to a given a value. |
| Array find() and findIndex() | 45 | 10 | widely | The find() and findIndex() methods of arrays and typed arrays search an array for the first item that satisfies a test function. |
| Array findLast() and findLastIndex() | 97 | 15.4 | widely | The findLast() and findLastIndex() methods of arrays and typed arrays search an array in reverse order for the first item that satisfies a test function. |
| Array flat() and flatMap() | 69 | 12 | widely | The flat() and flatMap() methods for arrays creates a new array such that each nested array item is concatenated into it. |
| Array.from() | 45 | 10 | widely | The Array.from() and typed array .from() static methods copy items from an iterable or array-like object to make a new array. |
| Array.fromAsync() | 121 | 16.4 | widely | The Array.fromAsync() static method copies items from an async iterable object to make a new array. |
| Array grouping | 117 | 17.4 | widely | The Object.groupBy() and Map.groupBy() static methods group values of arrays and iterables based on a function that returns a key for each value. |
| Array includes() | 47 | 10 | widely | The includes() method of arrays and typed arrays returns whether a given value appears in the array. |
| Array.isArray() | 4 | 5 | widely | The Array.isArray() static method checks whether a value is an array. |
| Array iteration methods | 3 | 4 | widely | Array iteration methods |
| Array iterators | 66 | 10 | widely | Arrays are iterable with the for … of statement and enumerable with the methods entries(), keys(), and values(). |
| Array.of() | 45 | 10 | widely | The Array.of() and typed array .of() static methods create new arrays from the values of any number of arguments. |
| Array splice() | 1 | 1 | widely | The array splice() method changes an array in-place. You can use it to delete items, overwrite items, or insert items, starting from an index. |
| <article> | 5 | 5 | widely | The <article> element represents self-contained content, which is intended to be independently distributable or reusable, such as a comment, a blog post, or news article. |
| <aside> | 5 | 5 | widely | The <aside> element represents a portion of a document whose content is only indirectly related to the document's main content. |
| aspect-ratio | 88 | 15 | widely | The aspect-ratio CSS property controls the width-to-height ratio of elements. For <img> and <video> elements, the width and height attributes used together with height: auto control the aspect ratio while the image/video is loading. |
| Async functions | 55 | 10.1 | widely | The async and await keywords allow you to use the asynchronous, promise-based behavior of a function without using promise chains. |
| Async clipboard | 76 | 13.1 | newly | The navigator.clipboard API asynchronously reads and writes to the system clipboard. |
| Async generators | 63 | 12 | widely | Async generator functions (async function*) create iterators that return multiple promises, one after another, on-demand. |
| Asynchronously iterable streams | 124 | 27 | newly | Asynchronous iteration of a stream allows you to use for await … of loops to iterate through a stream's incoming data. |
| Async iterators and the for await..of loop | 63 | 12 | widely | Asynchronous iterator objects, such as those returned by promises or generator functions, are iterable with the for await .. of loop. |
| Atomics.pause() | 133 | 18.4 | newly | The Atomics.pause() static method gives a hint to the CPU that the code calling the method is in a short-duration wait for shared memory, known as spinning or a spinlock. |
| Atomics.waitAsync() | 90 | 16.4 | newly | The Atomics.waitAsync() static method waits for a value in a shared memory location, providing a promise when the expected value is not yet in memory. The waitAsync() method is a non-blocking alternative to Atomics.wait(). |
| attr() (content only) | 2 | 3.1 | widely | The attr() CSS function, in content property declarations, sets a ::before or ::after pseudo-element's content to the value of the specified HTML attribute. |
| <audio> | 3 | 3.1 | widely | The <audio> element plays sound such as audio effects or music, optionally with controls provided by the browser. |
| AudioWorklet | 66 | 14.1 | widely | The AudioWorklet API runs module code in a separate thread, specifically for non-blocking, low latency audio processing. |
| AudioListener | 52 | 14.1 | limited | An AudioListener object represents the virtual position and orientation of a person relative to sound sources, to spatialize audio in a Web Audio context. |
| AudioListener setPosition() and setOrientation() | 14 | 6 | limited | The setPosition() and setOrientation() methods of the AudioListener API set the virtual position and orientation of a person relative to sound sources, to spatialize audio in a Web Audio context. |
| autocorrect | 153 | 14.1 | newly | The autocorrect global HTML attribute controls whether to automatically correct spelling or punctuation errors for user input. |
| :autofill | 110 | 15 | limited | The :autofill pseudo-class matches <input> elements that have been filled in automatically by the browser. |
| autofocus | 1 | 4 | widely | The autofocus HTML attribute gives focus to an element on page load. |
| Autonomous custom elements | 54 | 10.1 | widely | Autonomous custom elements are HTML elements with a hyphenated tag name (like <example-element>) that have behaviors you define. |
| AVIF | 85 | 16.4 | widely | AVIF (AV1 Image File Format) is an image format based on the AV1 video format. |
| <b> | 1 | 1 | widely | The <b> HTML element draws reader's attention to text, styling text as bold by default. |
| ::backdrop | 37 | 15.4 | widely | The ::backdrop CSS pseudo-element is a box underneath an element in the top layer, such as a <dialog>. It can be used to create obscuring effects distinguishing a modal element from the elements underneath. |
| backdrop-filter | 76 | 18 | newly | The backdrop-filter CSS property applies graphical effects such as blurring or color shifting to the area behind an element. |
| background | 1 | 1.3 | widely | The background CSS property is a shorthand that sets several background properties at once. |
| background-attachment | 1 | 15.4 | limited | The background-attachment CSS property sets whether an element's background image or gradient moves as the element scrolls. |
| background-blend-mode | 35 | 8 | widely | The background-blend-mode CSS property blends an element's background image and background color using blend modes like multiply, difference, or color. |
| background-clip | 21 | 5.1 | widely | The background-clip CSS property sets the extent of the background: the padding box, the content box, or the default border box. |
| background-clip: border-area | 150 | 18.2 | limited | The background-clip: border-area CSS declaration draws the background underneath only the border of an element. |
| background-clip: text | 120 | 14 | limited | The background-clip: text CSS declaration draws the background underneath only the text in the element. |
| background-color | 1 | 1 | widely | The background-color CSS property sets the fill color of an element, behind any content and background images or gradients. |
| background-image | 1 | 1.3 | widely | The background-image CSS property sets the graphics to display behind the content of an element and in front of the background color. Graphics may be any combination of images or gradients. |
| background-origin | 21 | 5.1 | widely | The background-origin CSS property sets the background starting position relative to the border and padding of an element. |
| background-position | 25 | 7 | widely | The background-position CSS property offsets the initial position of background images relative to the background origin. |
| background-repeat | 30 | 8 | widely | The background-repeat CSS property sets how a background image is tiled. |
| background-size | 21 | 5.1 | widely | The background-size CSS property scales or stretches a background based on the size of the element (with the contain and cover keywords), a length, or percentage. |
| Badging | 81 | 17 | limited | The navigator.setAppBadge() method allows installed web applications to display an application badge, typically a dot or number shown alongside the application's icon on the device's home screen or application dock. |
| BarProp | 1 | 3 | widely | The visible property of the window.locationbar, window.menubar, window.personalbar, window.scrollbars, window.statusbar, and window.toolbar APIs historically represented the visibility of a browser user interface. For privacy reasons, it now represents whether the window is a pop-up. |
| <base> | 1 | 3 | widely | The <base> element sets the base URL (the URL that relative URLs are relative to) for all relative URLs in the document. |
| Base64 encoding and decoding | 30 | 10 | widely | The atob() and btoa() global functions encode and decode strings to and from base 64, respectively. |
| baseline-shift | 1 | 4 | newly | The baseline-shift CSS property sets the position of an element relative to its dominant baseline. |
| <bdi> | 16 | 6 | widely | The <bdi> element isolates text that may have a different text direction from its surrounding text. This prevents the browser's bidirectional text algorithm from affecting or being affected by the direction of the surrounding text. |
| <bdo> | ≤15 | ≤4 | widely | The <bdo> element overrides the directionality of text, so that the text within is rendered in a different direction than the surrounding text. |
| Beacons | 39 | 11.1 | widely | The navigator.sendBeacon() method asynchronously sends an HTTP POST request with a limited amount of data, typically for app state, events, and analytics data. The one-way beacon is guaranteed to be initiated before the browser unloads the page, but the sender does not get to handle the response. |
| ::before and ::after | 1 | 4 | widely | The ::before and ::after CSS pseudo-elements select inline boxes preceding and following an element. They are often used with the content property to generate cosmetic content. |
| beforeunload | 1 | 3 | limited | The beforeunload event is fired when the current window is about to be unloaded. Typically this is used to display a dialog to confirm if users really want to leave the page when there is unsaved data that would be lost. |
| BigInt | 67 | 14 | widely | The BigInt JavaScript type represents integers of any size, including integers too large for the primitive Number type. |
| BigInt64Array | 67 | 15 | widely | The BigInt64Array and BigUint64Array typed arrays represent 64-bit integers, signed and unsigned respectively. |
| blocking="render" | 105 | 18.2 | limited | The blocking="render" attribute for <link>, <script>, and <style> elements blocks rendering until the external script or stylesheet has been loaded. For <link rel="expect">, rendering is blocked until a specific element is in the DOM. |
| <blockquote> | 1 | ≤4 | widely | The <blockquote> element represents an extended quotation, styling contents as an indented block by default. |
| BMP | 1 | 1 | widely | The BMP image format is an uncompressed raster graphics file format. Also known as a bitmap. |
| <body> | 1 | 3 | widely | The <body> element represents the content of an HTML document. |
| Border images | 56 | 9.1 | widely | The border-image CSS property draws an image around an element. |
| border-radius | 4 | 5 | widely | The border-radius CSS property rounds the corners of the border drawn around an element. |
| Borders | 1 | 1 | widely | The border CSS property sets the color, style, and width of the line around an element. |
| box-shadow | 10 | 5.1 | widely | The box-shadow CSS property applies shadow effects around an element's frame. This can create drop shadow and inner shadow effects. |
| box-sizing | 10 | 5.1 | widely | The box-sizing CSS property sets whether an element's width and height are calculated based on the content-box, which does not count the size of borders or padding, or border-box, which does count them. |
| <br> | 1 | 3 | widely | The <br> element produces line breaks in text. |
| BroadcastChannel | 54 | 15.4 | widely | The BroadcastChannel API allows you to send messages between same-origin browsing contexts, such as between the same page loaded in multiple tabs. |
| Brotli compression | 50 | 11 | widely | Brotli is a lossless data compression algorithm. When used as a content encoding, it often provides better compression than gzip. |
| <button> | 1 | 1 | widely | The <button> HTML element represents a button that triggers some action, such as submitting a form or opening a dialog, styled as a labeled rectangular box by default. |
| calc() | 26 | 7 | widely | The calc() CSS function computes mathematical expressions such a calc(100%/3 - 1em). |
| calc() keywords | 110 | 16 | widely | The e, pi, infinity, and NaN keywords represent well-defined constants accepted in CSS math functions such as calc(). |
| <canvas> | 1 | 2 | widely | The <canvas> HTML element is a space to draw graphics in, using the 2D canvas API, WebGL, or WebGPU. |
| 2D canvas | 1 | 2 | widely | The CanvasRenderingContext2D API is the "2d" rendering context for the <canvas> element. It represents a flat, two-dimensional space for drawing graphics and animations. |
| Color management for 2D canvas | 92 | 15.2 | limited | The optional colorSpace parameter of a 2D canvas's getContext() method chooses the color representation, such as "srgb" or "display-p3". |
| Desynchronized 2D canvas | 81 | 15 | limited | The optional desynchronized parameter of a canvas's getContext() method permits the browser to draw a 2D canvas independently of the event loop. This can reduce drawing latency. |
| willReadFrequently | 99 | 18 | newly | The optional willReadFrequently parameter of a canvas's getContext() method permits the browser to optimize for frequent getImageData() calls by avoiding hardware acceleration. Also known as multiple readback. |
| Canvas createConicGradient() | 99 | 16.4 | widely | The createConicGradient() methods draw a conic gradient to a 2D canvas. |
| Canvas reset() | 99 | 17.2 | widely | The reset() method clears a canvas to its initial state. |
| Canvas roundRect() | 99 | 16.4 | widely | The roundRect() methods draw a rounded rectangle to a 2D canvas. |
| cap unit | 118 | 17.2 | widely | The cap CSS length unit corresponds to the height of Latin capital letters. |
| captureStream() for <canvas> | 51 | 11 | widely | The captureStream() method for <canvas> elements returns a MediaStream which includes a CanvasCaptureMediaStreamTrack representing real-time video of the canvas image. You can use this to record the canvas, or send it elsewhere, such as another canvas or WebRTC connection. |
| caret-color | 57 | 11.1 | widely | The caret-color CSS property sets the color of the text insertion pointer in a text input. |
| Cascade layers | 99 | 15.4 | widely | The @layer CSS at-rule avoids specificity conflicts by providing priority levels for different groups of CSS rules, such as low-priority styles like resets, and high-priority styles like UI components. |
| Case-insensitive attribute selector | 49 | 9 | widely | The i identifier in a CSS attribute selector matches attribute values case-insensitively in document languages like XML where attribute values are case-sensitive. |
| ch unit | 27 | 7 | widely | The ch CSS length unit is a font-relative length based on the width of the zero (0) character. |
| Change event | 1 | 3 | widely | The change event for <input>, <select>, and <textarea> elements fires when the user modifies the element's value. Unlike the input event, the change event does not necessarily fire on every alteration to an element's value. |
| Channel messaging | 4 | 5 | widely | Channel messaging communicates one-to-one between browsing contexts on the same origin, such as between <iframe> elements or two documents using a shared worker. |
| @charset | 2 | 4 | widely | The @charset CSS at-rule specifies the character encoding of an external style sheet. |
| checkVisibility() | 105 | 17.4 | widely | The checkVisibility() method checks if an element is potentially visible, with optional parameters for the kinds of visibility to check. For example, it checks whether the element has the style display: none, but can also check for visibility: hidden. |
| <cite> | 1 | ≤4 | widely | The <cite> element represents the title of a quoted, referenced, or mentioned creative work, such as a film or book. |
| Classes | 42 | 9 | widely | Classes are an object-oriented syntax for JavaScript prototypes. |
| clip | 1 | 1.3 | limited | The clip CSS property sets the visible area of an absolutely positioned element. |
| clip-path | 88 | 13.1 | widely | The clip-path CSS property and SVG attribute set the visible area of an element. Everything outside the area will be hidden. |
| Animatable clipping paths | 55 | 12.1 | widely | The clip-path property can be animated using CSS transitions and animations. |
| Clip path boxes | 119 | 13.1 | widely | The fill-box, stroke-box, and view-box values for clip-path set an edge of the element's box to use as the clipping shape. |
| Clipboard events | 41 | 10.1 | widely | The "copy", "cut", and "paste" events fire on elements when the user starts an action with the clipboard. |
| ClipboardItem.supports() | 121 | 18.4 | newly | The ClipboardItem.supports() static method checks if the browser supports writing data types such as "image/svg+xml" or other custom formats to the system clipboard. |
| <code> | 1 | ≤4 | widely | The <code> element displays its contents as a fragment of computer code. |
| Color | 1 | 1 | widely | The color CSS property sets the primary foreground color of an element, which is used for text, the default border color, and text decorations. |
| color() | 111 | 15 | widely | The color() function picks a color from a given color space. Wide gamut color spaces like display-p3 allow showing more vibrant and saturated colors than the standard srgb color space. |
| color-gamut media query | 58 | 10 | widely | The color-gamut media query sets styles based on the colors a device can display. |
| color-mix() | 111 | 16.2 | widely | The color-mix() function mixes two colors in a given color space and by a given amount. Commonly, lighter or darker variations of a color are created by mixing with white or black. |
| color-scheme | 98 | 13 | widely | The color-scheme CSS property sets which color schemes (light or dark) an element uses and may prevent automatic dark mode adjustments by the browser. |
| COLRv0 | 53 | 11.1 | widely | COLRv0 is a font format that supports multi-color glyphs. COLRv0 supports only solid colors. |
| column-fill | 50 | 9 | widely | The column-fill CSS property sets the distribution of content across columns in a multi-column layout. |
| column-span | 50 | 9 | widely | The column-span CSS property controls whether a child element extends across all columns of a multi-column parent. |
| Selection composed ranges | 137 | 17 | newly | The window.getSelection().getComposedRanges() method returns ranges that represent the current user selection, even if the selection spans across shadow tree boundaries. |
| Composition events | 26 | 7 | widely | The compositionstart, compositionupdate, and compositionend events fire when an input method editor adds characters that might not be commonly available on keyboards. Examples of these characters are emoji, logograms in Asian languages, or input from speech recognition processors. |
| Compression streams | 80 | 16.4 | widely | The CompressionStream and DecompressionStream APIs compress and decompress data using the gzip or deflate formats. |
| Conic gradients | 69 | 12.1 | widely | The conic-gradient() and repeating-conic-gradient() CSS functions create backgrounds that progress between two or more colors around a center point. |
| Console | 1 | 3 | widely | The console API logs debugging messages to the browser development tools' console. |
| Constraint validation API | 40 | 10.1 | widely | Methods that validate form controls before submission, such as checkValidity(), reportValidity() and setCustomValidity(). |
| Constructed stylesheets | 73 | 16.4 | widely | The CSSStyleSheet constructor creates a new stylesheet which can be shared between a document and multiple shadow roots using adoptedStyleSheets. |
| contain | 52 | 15.4 | widely | The contain CSS property sets limits to the scope of styles, layout, and paint rendering for speed and efficiency. The none keyword value disables containment, strict is equivalent to contain: size layout style paint, and content is equivalent to contain: layout style paint. |
| Inline-size containment | 105 | 16 | widely | The contain: inline-size CSS declaration prevents the element's inline dimension from being set by the element's contents. This permits the browser to avoid slower layout calculations. |
| contain-intrinsic-size | 83 | 17 | widely | The contain-intrinsic-size CSS property sets the intrinsic size of an element. When using size containment, the browser will lay out the element as if it had a single child of this size. |
| Layout containment | 52 | 15.4 | widely | The contain: layout CSS declaration isolates the inside of an element such that it cannot affect the layout of the rest of the page or be affected by the rest of the page. This permits the browser to avoid slower layout calculations. |
| Paint containment | 52 | 15.4 | widely | The contain: paint CSS declaration prevents an element's descendants from being drawn outside the boundaries of the containing element, with any overflow clipped. This permits the browser to avoid slower painting calculations. |
| Size containment | 52 | 15.4 | widely | The contain: size CSS declaration sets an element's dimensions exclusively by its height and width properties, ignoring its contents and descendants. This permits the browser to avoid slower layout calculations. |
| Style containment | 52 | 15.4 | widely | The contain: style CSS declaration permits the browser to avoid slower layout calculations by preventing modification to counter (counter-increment and counter-set) and quotation styles (content property quote values) beyond the element's descendants. |
| Name-only container queries | 148 | 26.4 | newly | Name-only container queries with the @container … at-rule apply styles to an element based on the name of the element's container alone. |
| Container queries (size) | 105 | 16 | widely | Container size queries with the @container (…) at-rule apply styles to an element based on a dimension of its container, such as width or height. |
| Container style queries | 111 | 18 | newly | Container style queries with the @container at-rule apply styles to an element based on the values of custom properties of its container. |
| Content | 1 | 1 | widely | The content CSS property sets the content inside of an element or pseudo-element, replacing the current value. It's often used with the ::before and ::after pseudo-elements to generate cosmetic content. |
| content-visibility | 108 | 26 | newly | The content-visibility CSS property delays rendering an element, including layout and painting, until it is needed. |
| contenteditable | 1 | ≤4 | widely | The contenteditable global HTML attribute allows the user to edit the content of an element, such as inserting or deleting text. |
| contenteditable="plaintext-only" | 51 | 5.1 | newly | The contenteditable="plaintext-only" global HTML attribute allows the user to edit the content of an element, but prevents rich-text formatting. |
| contrast-color() | 147 | 26 | newly | The contrast-color() CSS function picks a color that has guaranteed contrast against a specified foreground or background color. |
| cookieEnabled | 1 | 18 | newly | The navigator.cookieEnabled property is a boolean for whether the browser accepts or ignores attempts to write cookie data. |
| Cookies | 1 | 1 | widely | The Set-Cookie HTTP header stores limited amounts of data that persist across request and response, creating shared state between the browser and server. |
| CORS | 4 | 4 | widely | Cross-Origin Resource Sharing is an HTTP-header based mechanism that allows a server to indicate any origins (domain, scheme, or port) other than its own from which a browser should permit loading resources. Also known as CORS. |
| counter-set | 85 | 17.2 | widely | The counter-set CSS property creates (and optionally sets a value for) a counter, the numbers for a series of headings or ordered list items. |
| @counter-style | 91 | 17 | widely | The @counter-style CSS at-rule sets custom counter styles for list items. For example, you can use a sequence of specific symbols instead of numbers for an ordered list. |
| Counters (CSS) | 2 | 3 | widely | The counter-reset and counter-increment CSS properties and the counter() and counters() functions automatically number headings or ordered list items. |
| createImageBitmap | 59 | 17.2 | widely | The createImageBitmap() global method creates an ImageBitmap object from a source such as an image, SVG, blob, or canvas. An ImageBitmap object represents pixel data that can be drawn to a canvas with lower latency than other types, such as ImageData. |
| Credential management | 60 | 13 | widely | The navigator.credentials API provides generic storage for authentication credentials. Other credential APIs represent specific kinds of credentials, such as password or public key credentials, that the credential management API stores. |
| crisp-edges | 148 | 7 | newly | The image-rendering: crisp-edges CSS declaration scales images to preserve lines without blurring. |
| Cross-document view transitions | 126 | 18.2 | limited | The @view-transition CSS rule sets whether a document opts-in to transitions between documents in a multi-page application. Both the old and new document must opt-in for a transition to be triggered. |
| Content Security Policy (CSP) | 25 | 7 | widely | Content Security Policy (CSP) helps to mitigate certain security threats, including cross-site scripting (XSS) and clickjacking attacks. It consists of a set of directives from a website to a browser, which instruct the browser to restrict the things that the site is allowed to do. |
| CSS.escape() | 46 | 10.1 | widely | The CSS.escape() static method escapes a string so that it can be used in a valid CSS selector. |
| CSS object model | 28 | 9 | widely | The CSS object model API reads, creates, and modifies CSS stylesheets and inline styles. Also known as CSSOM. |
| CSS.supports() | 61 | 11 | widely | The CSS.supports() static method returns whether the browser supports a CSS declaration (given by two arguments, a property and value) or an @supports at-rule condition string. |
| CSS typed object model | 66 | 16.4 | limited | The CSSStyleValue and its subclasses represent CSS values as distinct types instead of only strings. Also known as typed OM. |
| cubic-bezier() easing | 16 | 6 | widely | The cubic-bezier() CSS easing function interpolates along a smooth curve, creating animations and transitions with continuous changes in speed. The ease, ease-in, ease-out, and ease-in-out keyword values are presets for common Bézier curves. |
| currentColor | 1 | 4 | widely | The currentColor CSS value allows you to reuse an element's computed text color for other properties. |
| Cursor styles | 68 | 11 | limited | The cursor CSS property styles the pointer, allowing you to provide hints to the user on how to interact with the hovered element. |
| Custom properties | 49 | 9.1 | widely | Custom properties are CSS properties prefixed with -- that set values you can reuse with the var() function. For example, you can set a --key-color property to reuse as border-color: var(--key-color). Also known as CSS variables. |
| Customizable <select> | 135 | 27 | limited | The <select> element's appearance, including the button, selected option, picker dropdown, and options, can be customized using CSS. |
| <data> | 62 | 10 | widely | The <data> element links a given piece of content with a machine-readable translation. |
| Data URLs | ≤4 | ≤3.1 | widely | Data URLs are URLs that start with the data: scheme and which directly contain data rather than point to remote resources. |
| <datalist> | 69 | 12.1 | limited | The <datalist> element sets recommended values for an <input> element. Browsers may show a dropdown menu of all values or match values as the user types. |
| Dataset | 7 | 5.1 | widely | The dataset API attaches and accesses custom data on elements, using either the dataset property of HTMLElement or attributes prefixed with data-. |
| Date | 1 | 1 | widely | The Date object represents a single moment in time. |
| getYear() and setYear() | 1 | 1 | limited | The getYear() and setYear() methods of Date objects get and set the year as an offset to 1900. |
| toGMTString() | 1 | 1 | limited | The toGMTString() method of Date objects is an alias to the toUTCString() method. |
| Declarative shadow DOM | 111 | 16.4 | widely | The shadowrootmode attribute on <template> creates a shadow root without the use of JavaScript. It is a declarative alternative to the attachShadow() method. |
| Dedicated workers | 4 | 4 | widely | The Worker() constructor runs a script in its own thread, which can send and receive messages with the script that created it. Also known as web workers. |
| :default | 10 | 5 | widely | The :default CSS pseudo-class matches the default element in a group of related form controls, such as checkboxes and radio buttons with the checked attribute. |
| <del> | 1 | ≤4 | widely | The <del> element represents a range of text that has been deleted from a document, styling text as strikethrough by default. |
| Description list | 1 | ≤4 | widely | The <dl>, <dt>, and <dd> HTML elements represent a list of terms and their associated descriptions. Use a description list to create glossaries or similar list of key-value pairs. |
| Destructuring | 60 | 11.1 | widely | The destructuring assignment syntax is a JavaScript expression that unpacks values from arrays, or properties from objects, into distinct variables. |
| <details> | 12 | 6 | widely | The <details> element is a disclosure widget which can be expanded to reveal additional content. When closed, only the nested <summary> element is visible. |
| ::details-content | 131 | 18.4 | newly | The ::details-content pseudo-element selects the expandable content of a <details> element, excluding the <summary>. |
| Mutually exclusive <details> elements | 120 | 17.2 | newly | Multiple <details> elements which use the same name attribute are mutually exclusive. When one member of the group is opened, all other members are closed. |
| Device orientation events | 31 | 17 | widely | The DeviceMotion and DeviceOrientation events report the movement and orientation of the browser's device in physical space. Note that coordinates can differ noticeably between platforms and devices. |
| Device media queries | 1 | 3 | limited | The device-aspect-ratio, device-height, and device-width media features describe physical properties of the displaying output device. |
| <dfn> | 15 | 6 | widely | The <dfn> element marks a term to be defined, styling text as italic by default. |
| <dialog> | 37 | 15.4 | widely | The <dialog> HTML element represents a modal or non-modal dialog box, such as a confirmation prompt or a subwindow used to enter data. |
| Digital credentials | 141 | 26 | limited | The digital credentials API issues and requests digital credentials, such as driver's licenses or ID cards, with the browser or operating system. Digital credentials extend the navigator.credentials credential management API. |
| :dir() | 120 | 16.4 | widely | The :dir() CSS functional pseudo-class matches elements by text direction, either right to left (rtl) or left to right (ltr). |
| dirname | 17 | 6 | widely | The dirname attribute of <textarea> and <input> HTML elements includes the field's writing direction as form data on submission. |
| Display | 1 | 1 | widely | The display CSS property sets the display behavior of an element's box within its layout and sets the layout behavior for its child elements. |
| display animation | 117 | 18 | limited | You can animate elements between display: none and any other display value or animate between content-visibility: hidden and any other content-visibility value. This also applies to transitions. |
| display: flow-root | 58 | 13 | widely | The display: flow-root CSS declaration sets an element as the root element of a new flow layout for its children, preventing margin collapse with sibling elements. |
| display: list-item | 1 | 1 | widely | The display: list-item CSS declaration renders an element with the box layout of a <li> HTML element. |
| display: table | 1 | ≤4 | widely | The display: table CSS declaration renders an element with the box layout of a <table> HTML element. Child elements may use equivalents to <table> internal elements such as display: table-row for <tr>. |
| <div> | 1 | 1 | widely | The <div> HTML element is the generic container for content. |
| document.caretPositionFromPoint() | 128 | 26.2 | newly | The document.caretPositionFromPoint() method finds an insertion point, represented by a DOM node and an offset within that node, for given coordinates in the viewport. |
| Document colors | 64 | 11 | limited | A document's bgColor, fgColor, alinkColor, linkColor, and vlinkColor properties get and set the background, foreground, active link, link, and visited link colors of that document. |
| document.write() | 45 | 11 | limited | The document.open(), document.write(), document.writeln(), and document.close() methods write content to a document, possibly while that document is still loading. |
| DOM | 1 | 1 | widely | The DOM (Document Object Model) API represents HTML and XML documents as trees of nodes. You can use the API to inspect and modify the structure and content of a document. |
| DOM Geometry | 61 | 11 | widely | The DOMMatrix, DOMPoint, DOMQuad and DOMRect APIs represent points, rectangles, quadrilaterals and transformation matrices within JavaScript. They can be used in transformations in CSS, <canvas>, and SVG. |
| dominant-baseline | 1 | 4 | widely | The dominant-baseline CSS property sets the specific baseline used to align an elements's text and inline-level contents. |
| DOMParser | 31 | 9.1 | widely | The DOMParser API parses XML or HTML source code from a string into a DOM Document. |
| download | 14 | 10.1 | widely | The download attribute for <a> elements loads the target URL as a file to be saved, instead of navigating to it. An optional attribute value sets a default file name. |
| Drag and Drop | 3 | 4 | widely | The Drag and Drop API lets users drag and drop elements and external files such as images onto web pages. Developers can customize which elements can become draggable, the type of feedback the draggable elements produce, and the droppable elements. |
| dynamic-range media query | 98 | 13.1 | widely | The dynamic-range CSS media query sets styles based on whether a device can display at least standard range colors or at least high range colors. Non-visual devices will match neither. |
| document.elementFromPoint() and document.elementsFromPoint() | 43 | 11.1 | widely | The document.elementFromPoint() and document.elementsFromPoint() methods find the top-most element at a given point in the viewport, or all elements at a given point in the viewport, respectively. |
| <em> | 1 | ≤4 | widely | The <em> HTML element emphasizes or stresses the content, styling text as italic by default. |
| em unit | 1 | 1 | widely | The em CSS length unit is a font-relative length equal to the specified font size. In an element with a 2 inch font, 1em equals 2 inches. |
| <embed> | 1 | ≤4 | widely | The <embed> element represents an external resource such as a PDF or SVG document. It was historically used for plugins such as Shockwave Flash. |
| :empty | 1 | 3.1 | widely | The :empty CSS pseudo-class matches elements without child elements. |
| Encrypted media extensions | 42 | 12.1 | widely | The mediaKeys property of HTMLMediaElement and the navigator.requestMediaKeySystemAccess() method control the playback of content subject to digital rights management. Also known as EME. |
| enterkeyhint | 77 | 13.1 | widely | The enterkeyhint global HTML attribute sets the label for a virtual keyboard's Enter key. For example, enterkeyhint="search" may label the key with a magnifying glass icon. |
| Error cause | 93 | 15 | widely | The cause property of errors records the specific original cause of the error, particularly for errors that have been re-thrown. |
| escape() and unescape() | 1 | 1 | limited | The escape() and unescape() built-in Javascript methods encode and unencode strings using percent encoding, where certain characters are replaced by hexadecimal escape sequences. |
| Event timing performance entries | 76 | 26.2 | newly | An event or first-input performance entry measures the latency of user input events, such as mouse clicks or keypresses. They're used to calculate interaction to next paint (INP), a common metric for perceived responsiveness. |
| Events | 1 | 1 | widely | The Event API and the addEventListener() method on objects that receive events (event targets) represent and handle significant things happening on a page. Many APIs fire events for a wide range of situations relating to those APIs, such as an image loading, a user clicking, or a value changing. |
| ex unit | 1 | 1 | widely | The ex CSS length unit is a font-relative length equal to the used x-height of the first available font. X-height is often equal to the height of the lowercase x. |
| execCommand() | 1 | 1.3 | limited | The document.execCommand() method reads and writes from the clipboard and performs editing commands on editable text, such as changing the font name or style. Related methods check whether commands are supported, enabled, or applied. |
| Exponential functions (CSS) | 120 | 15.4 | widely | The pow(), sqrt(), hypot(), log(), and exp() CSS functions compute various exponential functions. |
| Exponentiation operator | 52 | 10.1 | widely | The exponentiation (**) operator returns the result of raising the first operand to the power of the second operand. |
| EXT_blend_minmax WebGL extension | 38 | 9 | widely | The EXT_blend_minmax extension for WebGL 1.0 contexts adds two blend equations, the minimum and maximum color components of the source and destination colors. |
| EXT_color_buffer_float WebGL extension | 56 | 15 | widely | The EXT_color_buffer_float extension for WebGL 2.0 contexts adds color-renderable floating point formats to renderbufferStorage(). |
| EXT_color_buffer_half_float WebGL extension | 63 | 14 | widely | The EXT_color_buffer_half_float extension for WebGL 1.0 and 2.0 contexts renders 16-bit floating-point color buffers. |
| EXT_float_blend WebGL extension | 75 | 14.1 | limited | The EXT_float_blend extension for WebGL 1.0 and 2.0 contexts adds 32-bit floating-point components to blending and draw buffers. |
| EXT_frag_depth WebGL extension | 38 | 9 | limited | The EXT_frag_depth extension for WebGL 1.0 and 2.0 contexts adds setting the depth value of a fragment from within the fragment shader. |
| EXT_shader_texture_lod WebGL extension | 38 | 8 | widely | The EXT_shader_texture_lod extension for WebGL 1.0 and 2.0 contexts adds texture functions to the OpenGL ES Shading Language such that the shader writer explicitly controls the level of detail (LOD). |
| EXT_sRGB WebGL extension | 40 | 9 | widely | The EXT_sRGB extension for WebGL 1.0 contexts adds sRGB support to textures and framebuffer objects. |
| EXT_texture_compression_bptc WebGL extension | 93 | 16 | limited | The EXT_texture_compression_bptc extension for WebGL 1.0 and 2.0 contexts adds the BPTC compressed texture formats to compressedTexImage2D() and compressedTexSubImage2D(). |
| EXT_texture_compression_rgtc WebGL extension | 93 | 14.1 | newly | The EXT_texture_compression_rgtc extension for WebGL 1.0 and 2.0 contexts adds RGTC compressed texture formats. RGTC is a block-based texture compression format suited for unsigned and signed red and red-green textures. Also known as Red-Green Texture Compression. |
| EXT_texture_filter_anisotropic WebGL extension | 34 | 9.1 | widely | The EXT_texture_filter_anisotropic extension for WebGL 1.0 and 2.0 contexts adds anisotropic filtering (AF). AF improves the quality of mipmapped texture access when viewing a textured primitive at an oblique angle. |
| EXT_texture_norm16 WebGL extension | 87 | 16 | limited | The EXT_texture_norm16 extension to WebGL 2.0 contexts adds 16 bit signed normalized and unsigned normalized fixed-point texture, renderbuffer, and texture buffer formats. |
| Fetch | 42 | 10.1 | widely | The fetch() method makes asynchronous HTTP requests. |
| Fetch priority | 103 | 17.2 | newly | The fetch() priority option and the fetchpriority HTML attribute give hints to the browser about which requests to do before other requests of the same type. |
| field-sizing | 123 | 26.2 | newly | The field-sizing CSS property allows form controls such as <textarea> to be sized based on their content. |
| <fieldset> and <legend> | 1 | ≤4 | widely | The <fieldset> and <legend> elements group several form control elements within a web form. |
| <figure> and <figcaption> | 8 | 5.1 | widely | The <figure> and <figcaption> HTML elements represent an illustration, diagram, text, or other self-contained reference content, with an optional caption. |
| File API | 38 | 10.1 | widely | The File API represents and reads from file data and metadata. Typically, you get files through other APIs, such as the <input type="file"> element or drag-and-drop events. You may also send file data to other APIs, such as creating images or drawing on canvases. |
| ::file-selector-button | 89 | 14.1 | widely | The ::file-selector-button CSS pseudo-element selects the button of a <input type="file"> element. |
| filter | 53 | 9.1 | widely | The filter CSS property applies one or more graphic effects to an element. You can use filter functions, such as blur() and drop-shadow(), alone or combined to produce different effects. For instance, filter: blur(2px). |
| ::first-letter | 1 | 1 | widely | The ::first-letter CSS pseudo-element selects the first letter in an element for styling. |
| ::first-line | 1 | 1 | widely | The ::first-line CSS pseudo-element selects the first line of text in an element for styling. |
| fit-content | 46 | 11 | widely | The fit-content CSS keyword expands a box as needed to fit its contents until the maximum size is reached, preserving the content's preferred aspect ratio. |
| Fixed positioning | 1 | 1 | widely | The position: fixed CSS declaration removes an element from the normal flow and positions it relative to the viewport or page. |
| Flexbox | 29 | 9 | widely | Flexbox is a one-dimensional layout system, which places content either horizontally or vertically, with optional wrapping. |
| Flexbox gap | 84 | 14.1 | widely | The gap CSS property in a flexbox layout sets the size of the space between items. |
| float and clear | 1 | 1 | widely | The float CSS property aligns an element to either side of its container, allowing text and inline elements to flow around it. The clear CSS property sets whether an element is moved below floating elements that proceed it. |
| Float16Array | 135 | 18.2 | newly | Float16Array is a typed array of 16-bit floating point numbers. |
| Focus events | 1 | 3.1 | widely | Focus events, such as focus and blur, fire when an element gets or loses focus. |
| :focus-visible | 86 | 15.4 | widely | The :focus-visible CSS pseudo-class selects elements that match the :focus pseudo-class and meets the browser's criteria for visually emphasizing focused elements. |
| :focus-within | 60 | 10.1 | widely | The :focus-within CSS pseudo-class matches an element if the element or any of its children are focused. |
| font-display | 60 | 11.1 | widely | The font-display CSS descriptor sets whether to show a substitute font or nothing while a font face loads. The property manages what's known as a flash of unstyled text or flash of invisible text. |
| @font-face | 36 | 10 | widely | The @font-face CSS at-rule creates a custom font-family value. The at-rule's descriptors set the font's name, source, and various display settings. |
| font-family | 1 | 1 | widely | The font-family CSS property sets the desired font face for text, along with optional fallback font faces. |
| Math font family | 109 | 26.2 | newly | The font-family: math CSS declaration uses the browser default font face for displaying mathematical expressions. |
| System font | 56 | 11 | widely | The font-family: system-ui CSS declaration uses the operating system default font for text. |
| font-feature-settings | 48 | 9.1 | widely | The font-feature-settings CSS property sets low-level OpenType feature tags for a font. When possible, use font-variant instead. |
| font-kerning | 33 | 9 | widely | The font-kerning CSS property sets whether kerning data from a font is used to adjust the space between letters. |
| Font loading | 35 | 10 | widely | The document.fonts API dynamically loads custom fonts and tracks when fonts are loading or ready to use. |
| font-optical-sizing | 79 | 13.1 | widely | The font-optical-sizing CSS property sets whether text rendering is optimized for viewing at different sizes. |
| font-palette | 101 | 15.4 | widely | The font-palette CSS property selects a color palette from the font, optionally overriding individual colors in the @font-palette-values at-rule. |
| Font shorthand | 1 | 1 | widely | The font CSS property shorthand sets multiple font properties, including style, weight, size, and font family. |
| font-size | 1 | 1 | widely | The font-size CSS property sets the text height. |
| font-size-adjust | 127 | 17 | newly | The font-size-adjust CSS property preserves apparent text size, regardless of the font used, by scaling fonts to the same size with respect to a specific metric, such as x-height. This can help make fallback fonts look the same size. |
| font-stretch | 62 | 11.1 | widely | The font-stretch CSS property selects a font face from a font family based on width, either by a keyword such as condensed or a percentage. |
| font-style | 1 | 1 | widely | The font-style CSS property sets the text style, with normal, italic, and oblique options. |
| font-synthesis | 97 | 9 | widely | The font-synthesis CSS shorthand property disables all font synthesis except the given kinds. To disable a specific kind of font synthesis, instead use the longhand properties such as font-synthesis-style and font-synthesis-weight. |
| font-synthesis-small-caps | 97 | 16.4 | widely | The font-synthesis-small-caps CSS property sets whether or not the browser should synthesize small caps typefaces when they're missing from the font. |
| font-synthesis-style | 97 | 16.4 | widely | The font-synthesis-style CSS property sets whether or not the browser should synthesize italic and oblique typefaces when they're missing from the font. |
| font-synthesis-weight | 97 | 16.4 | widely | The font-synthesis-weight CSS property sets whether or not the browser should synthesize bold typefaces when they're missing from the font. |
| font-variant | 1 | 1 | widely | The font-variant CSS property is a shorthand for font-variant-alternates, font-variant-caps, font-variant-east-asian, font-variant-emoji, font-variant-ligatures, font-variant-numeric, and font-variant-position. |
| font-variant-alternates | 111 | 9.1 | widely | The font-variant-alternates CSS property, along with the @font-feature-values at-rule, chooses when to use a font's alternate glyphs. |
| font-variant-caps | 52 | 9.1 | widely | The font-variant-caps CSS property sets whether text should be displayed in small caps, petite caps, or with capital letters designed for titles. |
| font-variant-east-asian | 63 | 9.1 | widely | The font-variant-east-asian CSS property controls glyph substitution and sizing in East Asian text. |
| font-variant-ligatures | 34 | 9.1 | widely | The font-variant-ligatures CSS property sets how characters can be visually combined for readability or stylistic reasons. |
| font-variant-numeric | 52 | 9.1 | widely | The font-variant-numeric CSS property sets how numeric characters are displayed. For example, you can align columns of numbers or use zeroes that have a slash. |
| font-variation-settings | 62 | 11 | widely | The font-variation-settings CSS property sets an "axis of variability" on a variable font, such as weight, optical size, or a custom axis defined by the typeface designer. When possible, use other CSS font properties, such as font-weight: bold. Also known as variable fonts. |
| font-weight | 2 | 1 | widely | The font-weight CSS property controls the thickness of a font. It is set explicitly with the keyword bold or a number, or relative to the inherited thickness with the keywords bolder or lighter. |
| Forced colors | 89 | 16 | widely | The forced-colors CSS @media rule detects when a user has chosen to use a forced colors mode, also known as high-contrast mode, and the forced-color-adjust CSS property sets whether forced colors apply to an element. |
| <form> | 1 | 3 | widely | The <form> element contains interactive controls for submitting information. |
| Form-associated custom elements | 77 | 16.4 | widely | Custom elements may act like built-in form elements, via the attachInternals() method of HTMLElement and the ElementInternals API. |
| Form validity pseudo-classes | 10 | 5 | widely | The form validity CSS pseudo-classes match <form> elements based on the constraints of a form field, such as validity (:valid, :invalid, :in-range, :out-of-range) and necessity (:optional or :required). |
| Fullscreen API | 71 | 16.4 | limited | The fullscreen API makes a specific element fill the whole screen and hides most browser UI. |
| Functions | 1 | 1 | widely | Functions are series of statements that can be called and return a value. The function keyword (as in function () { }) and arrow (=>) expression create functions. The JavaScript functions protocol includes default and rest parameters and binding to this. |
| Function caller and arguments | 1 | 3 | limited | The caller and arguments properties of a non-strict mode Function object are the function that called it and the arguments it was called with. Not to be confused with the arguments variable in a function body's local scope. |
| Gamepad | 35 | 10.1 | widely | The navigator.getGamepads() API accesses and responds to signals from game controllers. |
| Gamepad haptic feedback | 68 | 16.4 | limited | The gamepad.vibrationActuator property represents a gamepad's haptics hardware, which allows you to control the vibration motors in a gamepad. |
| Generators | 39 | 10 | widely | Generator functions (function*) create iterators that return multiple values, one after another, on-demand. |
| Geolocation API | 5 | 5 | widely | The navigator.geolocation API requests the user's latitude, longitude, heading, and speed. |
| getComputedStyle() | 11 | 5.1 | widely | The getComputedStyle() global method returns an CSSStyleDeclaration object that represents all CSS declarations applied to a given element. |
| getHTML() | 125 | 18 | newly | The getHTML() method of Element and ShadowRoot objects serializes an element's DOM to an HTML string. |
| Map getOrInsert() | 145 | 26.2 | newly | The getOrInsert() and getOrInsertComputed() methods of Map objects get a value, setting and getting a default value if needed. |
| GIF | 1 | 1 | widely | The GIF (Graphics Interchange Format) image format is a raster graphics file format with animation and lossless compression. |
| globalThis | 71 | 12.1 | widely | The globalThis property accesses the global this value (and hence the global object itself) across environments. |
| Gradient interpolation | 111 | 16.2 | newly | Gradient interpolation controls how the colors between gradient stops are calculated in CSS. For example, linear-gradient(to right in oklch longer hue, red, red); calculates in the oklch color space, with the hue going all the way around the hue circle from red back to red. |
| Gradients | 26 | 7 | widely | The linear-gradient() and radial-gradient() CSS functions and their repeating counterparts create backgrounds that progress smoothly between multiple colors. |
| Grid | 57 | 10.1 | widely | CSS grid is a two-dimensional layout system, which lays content out in rows and columns. |
| Grid animation | 107 | 16 | widely | Grid animation allows you to animate the grid-template-columns and grid-template-rows CSS properties. |
| hardwareConcurrency | 37 | 15.4 | widely | The navigator.hardwareConcurrency property is the number of logical processors available to run threads on the user's computer. |
| :has() | 105 | 15.4 | widely | The :has() CSS functional pseudo-class matches an element if any of the selectors passed as parameters would match at least one element. |
| Hashbang comments | 74 | 13.1 | widely | The #! comment at the absolute start of a script or module is treated as a normal comment and is ignored by the JavaScript engine. |
| hashchange | 16 | 6 | widely | The hashchange event fires when the URL fragment identifier (the part of the URL starting with #) of the current page has changed. |
| <head> | 1 | 1 | widely | The <head> element contains machine-readable information (metadata) about the document, such as the title, <script> and <style> elements, and <meta> elements. |
| <header> and <footer> | 5 | 5 | widely | The <header> and <footer> HTML elements represent content that precedes and follows the main page content, respectively. |
| <h1> through <h6> | 1 | 3 | widely | The <h1> through <h6> HTML elements represent six levels of section headings, in order of decreasing importance. |
| <hgroup> | 5 | 5 | widely | The <hgroup> element represents a heading and related content. |
| Custom highlights | 105 | 17.2 | newly | Custom highlights style arbitrary text ranges, without adding extra elements to the DOM. |
| History | 5 | 5 | widely | The window.history API manipulates the browser session history, from navigations to state management, in the tab or frame that the current page is loaded in. |
| Host | 54 | 10 | widely | The :host CSS pseudo-class selects the containing element of the shadow tree in which it is used. The :host() CSS pseudo-class selects the that element only if it matches the provided selector. |
| <hr> | 1 | 3 | widely | The <hr> element represents a thematic break between paragraphs, often shown as a horizontal rule. |
| HSL | 65 | 12.1 | widely | The hsl() and hsla() CSS functions pick colors using hue, saturation, lightness, and alpha (transparency) channels. |
| HTTP Strict Transport Security | 4 | 7 | widely | The Strict-Transport-Security HTTP response header informs browsers that the site should only be accessed using HTTPS, and that any future attempts to access it using HTTP should automatically be converted to HTTPS. Also known as HSTS. |
| <html> | 1 | 1 | widely | The <html> element represents the top-level of an HTML document and is referred to as the root element. |
| HTML wrapper methods | 1 | 1 | limited | JavaScript built-in methods such as, String.bold() and String.italics(), wrap strings in (often historic) HTML. |
| HTTP authentication | 1 | 1 | widely | The Authorization and WWW-Authenticate headers authenticate a user with a server. |
| HTTP/1.1 | 1 | 1 | widely | HTTP/1.1 is a network protocol used by browsers and servers. It has been superseded by HTTP/2 and HTTP/3. |
| HTTP/2 | 41 | 9 | widely | The HTTP/2 protocol is a major revision of the HTTP network protocol, providing improved performance and efficiency by using a single TCP connection to send multiple streams of data at once. |
| HTTP/3 | 87 | 18 | newly | HTTP/3 is a major revision of the HTTP network protocol, providing improved performance and efficiency by using QUIC as the underlying transport protocol. |
| HWB | 101 | 15 | widely | The hwb() CSS function picks colors using hue, whiteness, and blackness channels. |
| Hyphenate character | 106 | 17 | widely | The hyphenate-character CSS property sets the character or string to use at the end of a line before a line break. |
| Hyphenation | 88 | 17 | widely | The hyphens CSS property controls when long words are broken by line wrapping. Although called hyphens, the property applies to word-splitting behavior across languages, such as customary spelling changes or the use of other characters. Support for non-English languages varies significantly. |
| <i> | 1 | 1 | widely | The <i> HTML element identifies idiomatic content, styling text as italic by default. |
| ic unit | 106 | 15.4 | widely | The ic CSS length unit corresponds to the width of CJK ideographic characters. |
| <iframe> | 1 | ≤4 | widely | The <iframe> element embeds another HTML page into the current page. |
| Sandboxed iframes | 5 | 5 | widely | The sandbox attribute for the <iframe> HTML element sets many security restrictions on the iframe, such as preventing form submissions or opening modal dialogs. Optional allow- values relax specific restrictions. |
| srcdoc | 20 | 6 | widely | The srcdoc attribute for the <iframe> HTML element sets a string of HTML to embed in the document. The value of srcdoc overrides loading a document from the src attribute. |
| Image maps | 1 | 1 | widely | The <area> and <map> elements define a clickable area on an image. |
| image-orientation | 81 | 13.1 | widely | The image-orientation CSS property corrects the rotation of an image using the image's metadata, such as EXIF. |
| image-rendering | 41 | 10 | widely | The image-rendering CSS property sets how images are scaled, retaining smoothness for photos, or hard edges for pixel art and QR codes. |
| image-set() | 113 | 17 | widely | The image-set() CSS function provides a set of images at different resolutions or pixel densities, which the browser can pick from, depending on the device capabilities. |
| ImageBitmapRenderingContext | 66 | 11.1 | widely | The ImageBitmapRenderingContext API is the "bitmaprenderer" rendering context for the <canvas> element. It is commonly used to transfer frames from an OffscreenCanvas to a user-visible <canvas> element. |
| <img> | 1 | 1 | widely | The <img> element adds an image into the document. |
| @import | 1 | 1 | widely | The @import CSS at-rule loads styles from another stylesheet. |
| Import maps | 89 | 16.4 | widely | A <script type="importmap"> HTML element provides an import map as a JSON string. An import map controls how the browser should resolve module specifiers when importing JavaScript modules. |
| Multiple import maps | 133 | 18.4 | limited | Multiple <script type="importmap"> HTML elements merge to produce the overall import map. |
| :indeterminate | 39 | 10 | widely | The :indeterminate CSS pseudo-class selects any form element whose state is indeterminate, such as checkboxes that have been set to an indeterminate state with JavaScript, or radio buttons which are members of a group in which all radio buttons are unchecked. |
| IndexedDB | 58 | 15 | widely | The IndexedDB API is a local storage transactional object database. |
| Individual transform properties | 104 | 14.1 | widely | The translate, rotate, and scale CSS properties apply single transformations independently, as opposed to applying multiple transformations with the transform CSS property. |
| inert | 102 | 15.5 | widely | The inert HTML attribute marks an element and its descendants as non-interactive. Inert elements don't get focus or fire click events. |
| inherit | 1 | 1 | widely | The inherit keyword resets any CSS property to the computed value of that property from the parent element. |
| initial | 1 | 1.2 | widely | The initial keyword resets any CSS property to its initial value as defined by the specification. For example, the initial value of the display property is inline, regardless of the element being styled. Not to be confused with revert, which resets to the user or browser default style. |
| <input> | 1 | 1 | widely | The <input type="text"> HTML element allows the user to enter information into a form. By default, an <input> element is a text input. |
| <input type="button"> | 1 | 1 | widely | The <input type="button"> HTML element represents a button that triggers some action, such as submitting a form or opening a dialog, styled as a labeled rectangular box by default. Not to be confused with the <button> element, which contains HTML content. |
| <input type="checkbox"> | 1 | 3 | widely | The <input type="checkbox"> HTML element represents a tickable box with two states, checked and unchecked. |
| <input type="color"> | 20 | 12.1 | limited | The <input type="color"> HTML element shows a color picker from which users can choose a color value. |
| Date and time <input> types | 20 | 14.1 | widely | The <input type="date"> and <input type="time"> HTML elements show date and time pickers. |
| Email, telephone, and URL <input> types | 5 | 5 | widely | The <input type="email">, <input type="tel">, and <input type="url"> HTML elements represent email address, telephone number, and URL fields in a form. |
| input (event) | 1 | 3.1 | widely | The input event fires when a form control changes or an element with the contenteditable attribute changes. |
| <input type="file"> | 2 | 4 | widely | The <input type="file"> HTML element shows a file picker from which users can choose a file to upload with the form. |
| <input type="file" multiple> | 2 | 4 | widely | The <input type="file" multiple> HTML element shows a file picker from which users can choose one or more files to upload with a form. |
| <input type="file" webkitdirectory> | 13 | 11.1 | newly | The <input type="file" webkitdirectory> HTML element shows a file picker from which users can choose a folder to upload with the form. |
| <input type="hidden"> | 1 | 1 | widely | The <input type="hidden"> HTML element represents a form field that is not shown visually but is still included in the form submission. |
| <input type="image"> | 1 | 1 | widely | The <input type="image"> HTML element is an image that can be used to submit a form, like the <input type="submit"> element. |
| <input type="number"> | 7 | 5.1 | widely | The <input type="number"> HTML element represents numeric input data. |
| <input type="password"> | 1 | 1 | widely | The <input type="password"> HTML element represents a field for users to enter a password. The password is hidden from view, typically replaced by dots or asterisks. |
| <input type="radio"> | 1 | 1 | widely | The <input type="radio"> HTML element represents one button in a group such that only one can be chosen at a time. |
| <input type="range"> | 4 | 3.1 | widely | The <input type="range"> element represents a slider for choosing an inexact value between a minimum and maximum value. |
| <input type="reset"> | 1 | 1 | widely | The <input type="reset"> HTML element represents a button that sets all form fields to their initial values. |
| Input selectors | 1 | 3.1 | widely | The :checked, :disabled, and :enabled CSS pseudo-classes match form elements based on their state. |
| <input type="submit"> | 1 | 1 | widely | The <input type="submit"> HTML element represents a button that triggers an action on its associated <form>, such as sending the form data to a server. |
| inputmode | 66 | 12.1 | widely | The inputmode global HTML attribute gives a hint about what type of data is to be entered into an <input> element, such as text, numeric, or email, so the browser may help the user enter data using an adapted input mechanism, such as an on-screen virtual keyboard. |
| <ins> | 1 | ≤4 | widely | The <ins> element represents a range of text that has been inserted into a document, styling text as underlined by default. |
| Interaction media queries | 41 | 9 | widely | The pointer, any-pointer, hover, and any-hover CSS media queries set styles based on the presence of pointing devices and their ability to hover over elements. For example, most smartphones match the (hover: none) and (pointer: coarse) media query. |
| Intersection observer | 58 | 12.1 | widely | The IntersectionObserver API asynchronously observes changes in the intersection of a target element with an ancestor element or with a top-level document's viewport. |
| Intl | 24 | 10 | widely | The Intl API provides language sensitive string comparison, number formatting, date and time formatting, and more. |
| Intl.DisplayNames | 81 | 14.1 | widely | The Intl.DisplayNames API provides localized names of language, region, script, and currency codes. |
| Intl.DurationFormat | 129 | 16.4 | newly | The Intl.DurationFormat API creates a locale-aware formatter that turns an object representing a duration (such as days, hours, and minutes) into a string. |
| Intl.ListFormat | 72 | 14.1 | widely | The Intl.ListFormat API creates a locale-aware formatter that turns iterable objects into localized strings. |
| Intl.Locale | 74 | 14 | widely | The Intl.Locale API parses Unicode locale identifiers, with language, region, and script codes, such as zh-Hans-CN or en-GB. |
| Intl.Locale info | 130 | 17 | newly | The getter methods of the Intl.Locale API provide supplemental information about a Unicode locale, such as the locale's calendar (for example, the first day in a week or the weekend start day), writing direction, 12- or 24-hour cycles, and numbering system. |
| Intl.PluralRules | 63 | 13 | widely | The Intl.PluralRules API creates a locale-aware object that tells you which of the language's pluralization rules apply based on a given number. |
| Intl.RelativeTimeFormat | 71 | 14 | widely | The Intl.RelativeTimeFormat API creates a locale-aware formatter that turns an object representing a relative time (such as '1 day ago') into a localized string. |
| Intl.Segmenter | 87 | 14.1 | newly | The Intl.Segmenter API creates a locale-aware text splitter that can separate a string into meaningful graphemes, words, or sentences. |
| Invoker commands | 135 | 26.2 | newly | The command and commandfor attributes for the <button> HTML element dispatch an action to an element when the button is invoked (by click or keystroke), as a declarative alternative to addEventListener() calls or onclick attribute handlers. |
| :is() | 88 | 14 | widely | The :is() CSS functional pseudo-class takes a selector list as its argument, and matches any element that can be selected by one of the selectors in that list. |
| isSecureContext | 55 | 11.1 | widely | The isSecureContext global property is a boolean for whether the current browsing context is secure. This is primarily a check that the page has been served over an HTTPS URL. |
| isolation | 41 | 8 | widely | The isolation CSS property creates a new stacking context, which impacts z-index ordering and blend modes. |
| Iterator.concat() | 146 | 26.4 | newly | The Iterator.concat() JavaScript method returns an iterator that yields values from a sequence of iterators, exhausting each iterator before moving on to the next. |
| Iterator methods | 122 | 18.4 | newly | The Iterator object is an abstract base for objects that implement the iterator protocol. It provides methods common to built-in iterators, such as filter(), find(), map(), and reduce(). You can also use the static method Iterator.from() to convert an existing iterable into an Iterator. |
| Iterators and the for...of loop | 38 | 7 | widely | The for...of loop operates on a sequence of values sourced from an iterable object, such as arrays, array-like objects, DOM collections, iterators, generators, and user-defined iterables. All built-in iterators inherit from the Iterator class. |
| JavaScript (initial core language support) | 5 | 5 | widely | JavaScript is a programming language that runs in browsers, usually through the <script> element. JavaScript has changed over many years. This feature represents the oldest language features, such as built-in objects, statements, and operators. Also known as ECMAScript. |
| JPEG | 1 | 1 | widely | The JPEG image format is a raster graphics file format with lossy compression. |
| JPEG XL | 155 | 17 | limited | The JPEG XL image format is a raster graphics file format that supports animation, alpha transparency, and lossy as well as lossless compression. |
| JavaScript modules | 61 | 11 | widely | JavaScript modules allow code to be organized into reusable units. Modules use import to load other modules and export to declare what is available to import from other modules. In HTML, modules are loaded with <script type="module">. |
| JavaScript modules in service workers | 91 | 15 | newly | The navigator.serviceWorker.register() method accepts { type: "module" } to load scripts that use import and export. Also known as ECMAScript modules or ESM in service workers. |
| JavaScript modules in shared workers | 80 | 16 | newly | The SharedWorker() constructor accepts { type: "module" } to load scripts that use import and export. Also known as ECMAScript modules or ESM in shared workers. |
| JavaScript modules in workers | 80 | 15 | widely | The Worker() constructor accepts { type: "module" } to load scripts that use import and export. Also known as ECMAScript modules or ESM in workers. |
| JSON | 3 | 4 | widely | The JSON API provides static methods for parsing values from and converting values to JavaScript Object Notation (JSON), a serialization format for objects, arrays, numbers, strings, Boolean values, and null. |
| JSON import attributes | 123 | 17.2 | newly | Module import … with { type: "json" } statements load JSON data. Also known as JSON module scripts. |
| JSON source text access | 114 | 18.4 | newly | To serialize and parse JSON in a lossless way, JSON.stringify() handles rawJSON values and JSON.parse()'s reviver callback takes a source context parameter. |
| <kbd> | 1 | ≤4 | widely | The <kbd> element represents textual user input, such as keyboard or voice input, styling text in monospaced type by default. |
| Keyboard events | 1 | 1.2 | widely | The keydown and keyup events fire for each key press (or, with modifier keys, a combination of key presses) on a keyboard. |
| KHR_parallel_shader_compile WebGL extension | 76 | 14.1 | limited | The KHR_parallel_shader_compile extension for WebGL 1.0 and 2.0 contexts checks the status of shader compilation without blocking the runtime. |
| Lab and LCH | 111 | 15 | widely | The CIE Lab color space expresses colors in terms of lightness and how red/green and blue/yellow a color is. LCH is a variant of Lab with polar coordinates. These color spaces can be used with the CSS color(), lab(), and lch() functions. Also known as CIELAB and CIELCH. |
| <label> | 1 | ≤4 | widely | The <label> HTML element represents a caption for a form field. |
| :lang() | 1 | 3.1 | widely | The :lang() CSS functional pseudo-class matches elements based on their content language. |
| lang | 1 | ≤4 | widely | The lang global HTML attribute defines the language of an element. It's used by assistive technology to correctly read the content, translation tools to select the origin language, and other applications. |
| Language | 1 | 1 | widely | The navigator.language property is a string representing the preferred language of the user, usually the language of the browser UI. The navigator.languages property is an array of strings representing the user's preferred languages. |
| Largest contentful paint (LCP) performance entries | 77 | 26.2 | newly | A largest-contentful-paint performance entry measures the time it takes for the largest image or text to appear. Largest contentful paint (LCP) is a common metric for perceived loading times. |
| Layout direction override | 48 | 11 | widely | The unicode-bidi and direction CSS properties override the Unicode layout algorithm. They are intended for Document Type Definition (DTD) designers. For HTML documents, you should use the dir global HTML attribute and <bdo> HTML element instead. |
| Let and const | 49 | 10 | widely | The let and const declarations define block-scoped variables. |
| letter-spacing | 1 | 1 | widely | The letter-spacing CSS property controls the amount of space between each letter in an element or block of text. |
| lh unit | 109 | 16.4 | widely | The lh CSS length unit corresponds to the requested line height, the computed value of the line-height property. Some lines may be higher than this based on their content. |
| light-dark() | 123 | 17.5 | newly | The light-dark() CSS function accepts two colors and uses one depending on the current color scheme. |
| light-dark() image values | 150 | 27 | newly | The light-dark() CSS function accepts, in addition to colors, two <image> values, such as a gradient or URL, and uses one depending on the current color scheme. |
| line-break | 83 | 13 | widely | The line-break CSS property sets how strictly to apply rules for wrapping text to new lines, especially for symbols and punctuation. |
| line-height | 1 | 1 | widely | The line-height CSS property sets the spacing between text baselines, oriented to the horizontal or vertical writing mode. |
| linear() easing | 113 | 17.2 | widely | The linear() easing function for animations and transitions interpolates linearly between the control points, and can be used to approximate complex easing functions, such as a bounce effect. |
| <link> | 1 | ≤4 | widely | The <link> element creates a relationship between the current document and an external resource, such as a stylesheet or favicon. |
| <link rel="dns-prefetch"> | 46 | 5 | newly | The rel="dns-prefetch" attribute for the <link> HTML element is a hint to the browser that the page or user is likely to request resources from another domain, so the browser should preemptively resolve DNS for the href value's domain. |
| <link rel="expect"> | 124 | 18.2 | limited | The rel="expect" attribute for the <link> HTML element is a hint to the browser to block rendering until the element that the href value references is connected to the document and fully parsed. |
| <link rel="preconnect"> | 46 | 11.1 | widely | The rel="preconnect" attribute for the <link> HTML element is a hint to the browser that the page or user is likely to request resources from another origin, so the browser should preemptively start a connection to the href value's origin. |
| <link rel="preload"> | 50 | 11.1 | widely | The rel="preload" attribute for the <link> HTML element requests resources, such as images or style sheets, that the page needs soon, so the browser may prioritize them for loading before rendering begins. |
| Link selectors | 65 | 9 | widely | The :link CSS pseudo-class matches unvisited links, :visited matches visited links, and :any-link matches both. |
| <ol>, <ul>, and <li> | 1 | ≤4 | widely | The <ol>, <ul>, and <li> HTML elements represent ordered and unordered lists. |
| List style | 1 | 1 | widely | The list-style shorthand CSS property and the list-style-image, list-style-position, and list-style-type longhand properties set the position and appearance of a list item's marker. |
| Lazy-loading images and iframes | 77 | 16.4 | widely | The loading="lazy" attribute for <img> and <iframe> elements blocks loading the external resource until the user scrolls to that element's part of the page. |
| localStorage and sessionStorage | 4 | 4 | widely | The localStorage and sessionStorage APIs store data as key-value pairs. While localStorage persists across sessions, sessionStorage data is discarded when the page is closed. |
| Location | 1 | 1 | widely | The location global object represents the current page's address. You can use it to get the parts of the address (such as location.hostname or location.pathname) or navigate to another URL. |
| Logical assignments | 85 | 14 | widely | The logical AND assignment (&&=) and the logical OR assignment (\|\|=) operators short-circuit the respective binary logical operators. |
| Logical properties | 89 | 15 | widely | CSS logical properties control borders, size, margin, and padding with directions and dimensions relative to the writing mode. For example, in a left to right, top to bottom writing mode, block-end refers to the bottom. Also known as flow relative. |
| <main> | 26 | 7 | widely | The <main> element represents the dominant content of a document. It is commonly used together with <header> and <footer>. |
| Web app manifest | 53 | 17 | limited | A web app manifest file provides metadata about the site. The browser can use the metadata to install the site as a standalone application on the user's device. The metadata usually includes the app's name, icon, description, and ways in which the app wishes to integrate with the device. |
| Map (initial support) | 38 | 8 | widely | Map objects hold key-value pairs and remember the original insertion order of the keys. |
| margin | 1 | 1 | widely | The margin CSS property sets space around an element. It is a shorthand for margin-top, margin-right, margin-bottom, and margin-left. |
| <mark> | 7 | 5.1 | widely | The <mark> element represents text which is marked or highlighted for reference or notation purposes. |
| mask-type | 24 | 7 | widely | The mask-type CSS property on an SVG <mask> element sets whether the mask is a luminance or alpha mask. |
| Masks | 120 | 15.4 | widely | The mask CSS property (and several longhand properties) partially or completely hides an element according to the shape and depth of an image. |
| matchMedia | 9 | 5.1 | widely | The window.matchMedia() method checks whether a media query applies to the document. |
| Math.sumPrecise() | 147 | 26.2 | newly | The Math.sumPrecise() static method returns the sum of an iterable of numbers. It avoids the precision loss of intermediate partial sums, as found using reduce() or a loop to add together an array of values. |
| MathML | 109 | 5.1 | widely | MathML, or the Mathematical Markup Language, describes mathematical notation, such as expressions and formulas. Also known as MathML Core. |
| Media capabilities | 101 | 15.4 | widely | The navigator.mediaCapabilities API queries the encoding and decoding abilities of the device, such as supported codecs, resolutions, and bitrates. |
| Media capture | 53 | 11 | widely | The navigator.mediaDevices.getUserMedia() API requests access to devices that produce audio or video streams, such as microphones or video cameras. |
| Media playback quality | 80 | 8 | widely | The getVideoPlaybackQuality() method of HTMLVideoElement returns metrics that can be used to determine the playback quality of a video, such as how many frames were dropped. |
| Media queries | 1 | 3 | widely | The @media CSS rule conditionally applies styles based on the output device type, its capabilities, and the user's preferences. Media queries are composed of an optional media type such as screen or print, and one or more mandatory media features, such as prefers-reduced-animations. |
| Media query range syntax | 104 | 16.4 | widely | The range syntax of CSS media queries allows you to use mathematical comparison operators such as <, >, <=, and >= to define a range of values for a media query. For example, (400px < width < 1000px) returns true if the viewport width is between 400px and 1000px. |
| Media session | 73 | 15 | limited | The navigator.mediaSession API integrates with platform UI for media playback. It can be used to set metadata such as title and artwork, and to handle user actions like playing, pausing, or seeking. |
| Media source | 31 | 8 | limited | The MediaSource API is a custom data source for media elements commonly used for adaptive streaming. Also known as Media Source Extensions (MSE). |
| MediaStream recording | 49 | 14.1 | widely | The MediaRecorder API captures data generated by MediaStream or HTMLMediaElement objects for analysis, processing, or saving to disk. Also known as the Media Recording API. |
| <menu> | 1 | 3 | widely | The <menu> element represents an unordered list of action items (<li>), such as a toolbar. It is a semantic alternative to the <ul> element. |
| messageerror | 60 | 16.4 | widely | The messageerror event fires on a target, such as a window or worker, when an incoming message cannot be deserialized. This event can fire for many types of messages, such as cross-document messages or broadcast channel messages. |
| <meta> | 1 | 1 | widely | The <meta> element represents metadata about the page used by the browser or search engines, including description, keywords, and character sets. |
| Meta refresh | 1 | ≤4 | widely | The <meta http-equiv="refresh"> HTML element and the equivalent Refresh HTTP header trigger a page reload or redirect. They apply only when the page is fully loaded, after other HTTP redirects or scripted redirects that might execute before the page is fully loaded. |
| <meter> | 6 | 6 | widely | The <meter> element represents a scalar value within a known range or a fractional value, typically shown as a progress bar. |
| min(), max(), and clamp() | 79 | 13.1 | widely | The min() and max() CSS functions return the minimum or maximum of the arguments, while clamp() clamps a value to a given range. |
| min-content and max-content | 46 | 11 | widely | The min-content and max-content CSS keywords represent the smallest and largest intrinsic sizes of an element. |
| Min and max width and height | 18 | 1.3 | widely | The min-width, min-height, max-width, and max-height CSS properties set the minimum and maximum size of an element. |
| mix-blend-mode | 41 | 8 | widely | The mix-blend-mode CSS property blends an element's content with its background or parent elements using blend modes like multiply, difference, or color. |
| Mixed content handling | 44 | ≤9.1 | widely | When a document is loaded over HTTPS, browsers ensure that none of the document's resources are loaded over an insecure protocol. Instead, resources that the document attempts to load over an insecure protocol are either loaded over HTTPS or are blocked. |
| :modal | 105 | 15.6 | widely | The :modal pseudo-class selects elements that put other elements into a non-interactive state, such as a fullscreen element or a <dialog> element used with showModal(). |
| <link rel="modulepreload"> | 66 | 17 | widely | The rel="modulepreload" attribute for the <link> HTML element indicates that a module script should be fetched, parsed, and compiled preemptively, and stored for later execution. |
| Motion path | 55 | 16 | widely | The offset CSS property animates an element along a defined motion path. |
| Mouse events | 1 | 1 | widely | Mouse events, such as click, mousedown, or mousemove, fire when users interact with an input or pointing device such as a mouse, trackpad, or touchscreen. |
| Multi-column layout | 50 | 9 | widely | Multi-column layout flows an element's content across one or more columns in a single row, without affecting the display property of its children. |
| MutationObserver | 26 | 7 | widely | The MutationObserver API watches for changes to the DOM tree and calls a callback function when DOM changes occur. |
| Named colors | 1 | 1 | widely | Some CSS color values can be referenced by name, such as red or limegreen. They stand in for specific RGB color values. |
| @namespace | 1 | 1 | widely | The @namespace CSS rule sets a default namespace or namespace prefix. Namespace prefixes allow CSS selectors to distinguish elements with the same name but different document types, such as the HTML <a> element and the SVG <a> element. |
| <nav> | 5 | 5 | widely | The <nav> element represents a section of a page whose purpose is to provide navigation links, either within the current document or to other documents. |
| Navigation API | 102 | 26.2 | newly | The navigation API initiates, intercepts, or modifies browser navigation actions. Not to be confused with the navigator API. |
| Navigation timing performance entries | 57 | 15 | widely | A navigation performance entry measures navigation events, such as loading time or the number of redirects. |
| Navigator | 1 | 1 | widely | The window.navigator API is a generic global object, under which many other, more interesting APIs are located. It doesn't do anything interesting on its own. |
| Nesting | 120 | 17.2 | widely | CSS nesting allows for shorter selectors, easier reading, and more modularity by nesting rules inside others. |
| :not() | 88 | 9 | widely | The :not() functional pseudo-class matches elements that do not match the selectors in its argument. |
| Notifications | 20 | 7 | limited | The Notification() constructor shows a message to the user, typically using the notification system of the host operating system. |
| Notifications from service workers and installed apps | 20 | 7 | widely | Notifications via service worker registration's showNotification() method, sent from installed web applications (for example, saved to the Home Screen on Safari for iOS), show a message to the user, typically using the notification system of the host operating system. |
| :nth-child() | 1 | 3.1 | widely | The :nth-child() and :nth-last-child() CSS functional pseudo-classes match elements based on their index within a list of elements. The :first-child and :last-child pseudo-classes match the first and last element in a list, and the :only-child pseudo-class matches an element with no siblings. |
| :nth-child() of <selector> | 111 | 9 | widely | The of syntax for the :nth-child() and :nth-last-child() CSS functional pseudo-classes match elements by the relative position of elements, counted from the first or last sibling matching a selector list. |
| :nth-of-type() pseudo-classes | 4 | 3.1 | widely | The :nth-of-type() and :nth-last-of-type() CSS functional pseudo-classes match elements based on their position among siblings of the same type. The :first-of-type, :last-of-type, and :only-of-type pseudo-classes match the first, last, and only elements of its type. |
| Nullish coalescing | 85 | 14 | widely | The nullish coalescing (??) and nullish coalescing assignment (??=) operators return (or assign) its right-hand side operand when its left-hand side operand is null or undefined, and otherwise returns its left-hand side operand. |
| Math and numbers | 1 | 1 | widely | The number type (and Number object) represents floating-point numbers, such as 42 or -4.201, while the Math API contains mathematical functions and constants. JavaScript can also represent boundless negative and positive values as Infinity or not-a-number as NaN (as in 0 * Infinity). |
| Numeric factory functions | 66 | 16.4 | limited | The numeric factory functions, such as CSS.px() or CSS.kHz(), return a CSSUnitValue representing a CSS number value (as in 12px or 440kHz). |
| Numeric separators | 75 | 13 | widely | To improve readability for numeric literals, underscores (_) can be used as separators. For example, 1_050.95 is equivalent to 1050.95. |
| <object> | 1 | 3 | widely | The <object> element represents an external resource such as a PDF or SVG document. It was historically used for plugins such as Shockwave Flash. |
| object-fit | 32 | 10 | widely | The object-fit CSS property sets how images, videos, and other replaced elements are scaled within their container. |
| Object.hasOwn() | 93 | 15.4 | widely | The Object.hasOwn() static method checks whether an object has a given property. It's a more robust alternative to the Object.prototype.hasOwnProperty() method. |
| Object | 1 | 1 | widely | Objects in JavaScript are collections of key-value pairs. |
| object-position | 32 | 10 | widely | The object-position CSS property places images, videos, and other replaced elements within their boxes. |
| OES_element_index_uint WebGL extension | 24 | 8 | widely | The OES_element_index_uint extension for WebGL 1.0 contexts adds support for gl.UNSIGNED_INT types to WebGLRenderingContext.drawElements(). |
| OES_fbo_render_mipmap WebGL extension | 80 | 14.1 | widely | The OES_fbo_render_mipmap extension for WebGL 1.0 contexts attaches any level of a texture to a framebuffer object. |
| OES_standard_derivatives WebGL extension | 10 | 8 | widely | The OES_standard_derivatives extension for WebGL 1.0 contexts adds the GLSL derivative functions dFdx, dFdy, and fwidth. |
| OES_texture_float WebGL extension | 10 | 8 | widely | The OES_texture_float extension for WebGL 1.0 contexts adds floating-point pixel types for textures. |
| OES_texture_float_linear WebGL extension | 29 | 8 | widely | The OES_texture_float_linear extension for WebGL 1.0 and 2.0 contexts adds linear filtering with floating-point pixel types for textures. |
| OES_texture_half_float WebGL extension | 27 | 8 | widely | The OES_texture_half_float extension for WebGL 1.0 contexts adds texture formats with 16-bit (also known as half float) and 32-bit floating-point components. |
| OES_texture_half_float_linear WebGL extension | 29 | 8 | widely | The OES_texture_half_float_linear extension for WebGL 1.0 contexts adds linear filtering with half floating-point pixel types for textures. |
| OES_vertex_array_object WebGL extension | 24 | 8 | widely | The OES_vertex_array_object extension for WebGL 1.0 contexts adds vertex array objects (VAOs) which encapsulate vertex array states. These objects keep pointers to vertex data and names for different sets of vertex data. |
| OfflineAudioContext | 35 | 14.1 | widely | The OfflineAudioContext API represents an audio processing graph that writes to an AudioBuffer instead of an output device. |
| Offscreen canvas | 69 | 16.4 | widely | The OffscreenCanvas API provides a canvas that can be drawn to off screen, with no dependencies on the DOM, which can be used to run heavy rendering operations inside a worker context. |
| Oklab and OkLCh | 111 | 15.4 | widely | The Oklab color space expresses colors in terms of lightness and how red/green and blue/yellow a color is, aiming to match how humans perceive colors. OkLCh is a variant of Oklab with polar coordinates. These color spaces can be used with the CSS oklab() and oklch() functions. |
| Online status | 2 | 4 | widely | The navigator.onLine property is a boolean for whether the browser is connected to some network (though not necessarily the internet). The online and offline events fire when the connection state changes. |
| opacity | 1 | 2 | widely | The opacity CSS property sets the transparency of an element. |
| Opacity (SVG) | ≤80 | ≤13.1 | widely | The fill-opacity, and stroke-opacity SVG attributes and CSS properties control the transparency of a stroke or fill of an SVG element. |
| :open | 133 | 26.5 | newly | The :open CSS pseudo-class matches elements that have open states, like <details>, <dialog>, or <select>, based on their state. |
| Optional catch binding | 66 | 11.1 | widely | Omit the binding parameter of a catch clause when you don't need information about the exception in a try ... catch statement. |
| Origin | 145 | 26.5 | limited | An Origin object represents an origin, as in a scheme, hostname, and port. You can use it to make same-site and same-origin comparisons. |
| Origin private file system | 108 | 16.4 | widely | The navigator.storage.getDirectory() method returns a FileSystemDirectoryHandle that is restricted to a specific origin and invisible to the user's actual file system for faster file-based applications, such as SQLite databases. |
| outline | 94 | 16.4 | widely | The outline CSS shorthand sets the color, style, and width of a line around an element, outside of the border. |
| Outlines | 1 | 1.2 | widely | The outline-color, outline-style, and outline-width and outline-offset CSS properties style a line around an element, outside of the border. |
| <output> | 10 | 7 | widely | The <output> element represents the result of a calculation, user action, or form entry. |
| Overflow media queries | 113 | 17 | widely | The overflow-block and overflow-inline CSS media queries set styles based on the way a device displays content that's larger than the viewport or page area. For example, a laptop lets users scroll to reveal content, while a printer displays overflowing content on additional pages. |
| overflow-anchor | 56 | 27 | newly | The overflow-anchor CSS property sets an element as a possible scroll anchor, reducing unintended scrolling when document changes occur above the current scrollport. This is enabled by default where supported. |
| overflow: clip | 90 | 16 | widely | The overflow: clip CSS declaration clips an element's overflowing content to the box that's defined by the overflow-clip-margin property. Unlike overflow: hidden, it allows you to hide overflow on one axis while keeping overflow on the other axis visible. |
| overflow: overlay | 114 | 12 | limited | The overflow: overlay CSS declaration is an alias to overflow: auto. Historically, it caused non-standard behavior, allowing scrollbars to overlay content without taking up layout space. |
| overflow | 68 | 13.1 | widely | The overflow CSS property sets the behavior for when content doesn't fit in an element. |
| overflow-wrap | 23 | 7 | widely | The overflow-wrap CSS property breaks a line of text onto multiple lines inside the targeted element in an otherwise unbreakable place to prevent overflow. The legacy property is word-wrap. |
| <p> | 1 | 3 | widely | The <p> element represents a paragraph of text. |
| padding | 1 | 1 | widely | The padding CSS property sets space between an element's edge and its contents. It is a shorthand for padding-top, padding-right, padding-bottom, and padding-left. |
| Page breaks | 50 | 10 | widely | In printed page layouts, the break-after, break-before, break-inside CSS properties control where printed pages start and end. Also known as pagination or page breaking. |
| Page selectors | 18 | 6 | limited | The :first, :left, and :right pseudo-classes select pages based on their position in sequence after pagination. |
| Page setup | 15 | 18.2 | newly | The @page CSS at-rule sets the page-specific dimensions and margins for content such as printed documents, ebooks, or slides. |
| Page transition events | 4 | 5 | widely | The pageshow and pagehide transition events fire when a document loads or unloads due to a navigation, such as clicking on a link on a page or the back button in a browser. |
| Page visibility | 33 | 7 | widely | The document.visibilityState and document.hidden properties tell you whether the page is visible to the user (for example, it's not minimized or in a background tab). |
| paint-order | 123 | ≤12 | widely | The paint-order CSS property sets the z-order of strokes, fills, and (in SVG content) markers. For example, paint-order: markers stroke fill; draws the markers, then stroke on top of markers, then fill on top of both markers and stroke. |
| Paint timing performance entries | 60 | 14.1 | widely | A paint performance entry measures the duration of "paint" (also called "render") operations as a page loads. It measures the time to First Paint (FP) and First Contentful Paint (FCP), common metrics for perceived loading times. |
| Unsanitized HTML parsing | 124 | 26 | newly | The Document.parseHTMLUnsafe() static method parses HTML into a DOM tree, much like the setHTMLUnsafe() DOM method inserts HTML into an existing tree. No sanitization applies, so never call it with user-provided strings. |
| Payment request | 60 | 11.1 | limited | The PaymentRequest API prompts the user to make a payment through the browser's user interface. |
| pdfViewerEnabled | 94 | 16.4 | widely | The navigator.pdfViewerEnabled property is a boolean for whether the browser navigates to and shows a PDF in the browser window or downloads the PDF. |
| Performance | 6 | 8 | widely | The performance global object and the PerformanceObserver API provide access to performance-related information for the current execution context. |
| PerformanceTiming and PerformanceNavigation | 56 | 14.1 | limited | The window.performance.timing and window.performance.navigation APIs report performance timing information for events that occur during the loading and use of the current page. |
| Permissions | 44 | 16 | widely | The navigator.permissions API checks whether a permission, such as access to geolocation data, has been granted. |
| Physical properties | 1 | 1 | widely | The physical CSS properties, top, right, bottom, and left, set the inset position of an element relative to the corresponding side of a container determined by the element's position property. |
| <picture> | 38 | 9.1 | widely | The <picture> element is used for art direction in responsive images, where a different image is displayed based on the <source> element. |
| Picture-in-picture (video) | 69 | 13.1 | limited | The picture-in-picture API allow websites to create a floating, always-on-top video window. Also known as PiP or pop-out video. |
| ping | 12 | 6 | limited | The ping attribute for <a> elements sets a URL to send a POST request to when the <a> is clicked. This is typically used for outbound link reporting. |
| ::placeholder | 57 | 10.1 | widely | The ::placeholder CSS pseudo-element selects help text in <input> and <textarea> elements when no value is set. |
| :placeholder-shown | 47 | 9 | widely | The :placeholder-shown CSS pseudo-element selects <input> and <textarea> elements when no value is set and the element's placeholder attribute is not empty. Not to be confused with ::placeholder, which selects the placeholder text itself. |
| PNG | 59 | 8 | widely | The PNG (Portable Network Graphics) image format is a raster graphics file format with animation, alpha transparency, and lossless compression. |
| pointer-events | 2 | 4 | widely | The pointer-events CSS property sets whether a user can interact with an element using a mouse, touch, or other pointing input device. |
| Pointer Events | 55 | 13 | widely | Pointer events, such as pointerdown, and the PointerEvent API, represent general pointing inputs, from a wide range of devices, such as a mouse, pen or stylus, or touch with one or more fingers. Not to be confused with the pointer-events CSS property. |
| Pointer lock | 37 | 10.1 | limited | Provides access to raw mouse movement by locking the target of mouse events to a single element and hiding the mouse cursor. |
| Popover | 116 | 17 | newly | The popover HTML attribute creates an overlay to display content on top of other page content. Popovers can be shown declaratively using HTML, or using the showPopover() method. |
| Position | 1 | 1 | widely | The position CSS property sets the origin position of an element to an element, the element's scrollport, or the viewport. |
| postMessage | 2 | 4 | widely | The postMessage() global method sends cross-origin messages to windows and workers, including popups and iframes. Also known as cross-document messaging. |
| <pre> | 1 | ≤4 | widely | The <pre> element represents a block element of preformatted text that is presented exactly as written, including all white space. |
| prefers-color-scheme media query | 76 | 12.1 | widely | The prefers-color-scheme CSS media query sets styles based on the requested color scheme, light or dark. |
| prefers-contrast media query | 96 | 14.1 | widely | The prefers-contrast CSS media query sets styles based on whether the user prefers more or less contrast, the difference between foreground and background colors. |
| prefers-reduced-motion media query | 74 | 10.1 | widely | The prefers-reduced-motion CSS media query sets styles based on whether the user prefers to minimize the amount of non-essential animations on the device, such as scrolling, panning, zooming, and strobing. |
| Preloading responsive images | 73 | 17.2 | widely | The imagesrcset and imagesizes attributes with the rel="preload" attribute for the <link> HTML element starts fetching responsive images before they're found in the body of the document. |
| preservesPitch | 86 | 17.2 | widely | The preservesPitch property for <audio> or <video> adjusts the pitch of audio to sound more natural when the playback rate is faster or slower than the default. |
| window.print() | 1 | 1.1 | widely | The window.print() method opens the browser's print dialog. |
| print-color-adjust | 136 | 15.4 | newly | The print-color-adjust CSS property sets whether styles of printed pages should be adjusted to use less ink, in cases such as light text on a dark background. |
| Print events | 63 | 13 | widely | An alternative to @media print queries, the beforeprint and afterprint events allow you to change the page for printing and restore the page after printing. |
| <progress> | 6 | 6 | widely | The <progress> element displays an indicator showing the completion progress of a task, typically displayed as a progress bar. |
| progress() | 138 | 26 | newly | The progress() CSS function returns a ratio for the relative position of one value between two other values, clamped between 0 and 1. You can use it to interpolate a value for other calculations. |
| Promise (initial support) | 32 | 8 | widely | A promise represents an asynchronous operation which eventually succeeds or fails. |
| Promise.allSettled() | 76 | 13 | widely | The Promise.allSettled() static method waits for an array of promises to settle (resolve or reject). |
| Promise.any() | 85 | 14 | widely | The Promise.any() static method returns a promise that fulfills as soon as the first of an iterable of promises fulfills, with that promise's value. Otherwise, it rejects with an AggregateError when all of the promises have rejected. |
| Promise finally() | 63 | 11.1 | widely | The promise finally() method executes a function when the promise settles (resolves or rejects). |
| Promise.try() | 128 | 18.2 | newly | The Promise.try() static method returns a promise that takes a callback of any kind (returns or throws, synchronously or asynchronously) and wraps its result in a Promise. |
| Promise.withResolvers() | 119 | 17.4 | widely | The Promise.withResolvers() static method is an alternative to the Promise() constructor that returns both the promise and resolution functions. You can use this to access resolve and reject outside the scope of the executor function. |
| __proto__ | 1 | 3 | limited | The __proto__ property of objects partially exposes the prototype of an object. |
| Proxy and Reflect | 49 | 10 | widely | The Proxy and Reflect JavaScript built-ins intercept and define custom behavior for fundamental language operations (such as property lookup, assignment, enumeration, or function invocation). |
| Push messages | 50 | 16 | widely | The Push API subscribes to and receives server-initiated messages. Subscribers receive pushed messages in the background, even after periods inactive or offline. |
| <q> | 1 | 3 | widely | The <q> element represents a short inline quotation. |
| Q unit | 63 | 13.1 | widely | The Q CSS length unit is an absolute length anchored to the physical measurement of quarter-millimeters. 1Q is equivalent to 1/40 of 1 centimeter. |
| queueMicrotask() | 71 | 12.1 | widely | The queueMicrotask() method schedules a function to run after the currently running synchronous JavaScript finishes but before returning to the event loop. |
| Quotes | 87 | 14.1 | widely | The quotes CSS property sets the quotation marks inserted via the content CSS property or <q> element. |
| rcap unit | 118 | 17.2 | newly | The rcap CSS length unit is a font-relative length equal to the value of the cap unit on the root element. Cap-height is approximately equal to the height of a capital Latin letter. |
| rch unit | 111 | 17.2 | newly | The rch CSS length unit is a font-relative length equal to the value of the ch unit on the root element. ch length is based on the width of the zero (0) character. |
| :read-only and :read-write | 1 | 4 | widely | The :read-only and :read-write CSS pseudo-classes match elements that are read-only or read-write, respectively. For example, :read-only matches <input> and <textarea> elements with the readonly attribute. |
| Readable byte streams | 89 | 26.4 | newly | A ReadableStream constructed with { type: "bytes" } reads bytes from a stream without making extra copies, improving efficiency for streams of large chunks. Also known as BYOB or bring your own buffer. |
| rect() and xywh() | 119 | 17.2 | widely | The rect() CSS function creates a rectangle shape with insets from the edges of an element. The xywh() CSS function creates a rectangle shifted by an x and y distance. They can be used with clip-path and shape-outside. |
| Referrer policy | 85 | 15 | widely | The Referrer-Policy HTTP header and referrerpolicy HTML attributes control whether requests have the Referer header and what information the header contains. |
| Regular expressions | 1 | 1 | widely | The RegExp object represents a regular expression, a notation for matching text patterns. |
| RegExp compile() | 1 | 3.1 | limited | The compile() method of RegExp objects recompiles an existing regular expression object using a new pattern and flags. |
| RegExp.escape() | 136 | 18.2 | newly | The RegExp.escape() static method takes a string and replaces any characters that are potentially special characters of a regular expression with equivalent escape sequences. For example, RegExp.escape("[abc]") returns "\\[abc\\]". |
| RegExp static properties | 1 | 3 | limited | The RegExp object has several static properties to access the input and results of the most-recent regular expression match. |
| Registered custom properties | 85 | 16.4 | newly | The CSS.registerProperty() static method and the @property CSS at-rule register custom properties for which types and behaviors can be defined. |
| Relative colors | 125 | 18 | newly | The from keyword for color functions (color(), hsl(), oklch(), etc.) creates a new color based on a given color by modifying the values of the input color. Also known as relative color syntax (RCS). |
| Relative positioning | 1 | 1 | widely | The position: relative CSS declaration offsets the position of an element relative to its position in the normal flow. |
| rem | 4 | 5 | widely | The rem CSS length unit is a font-relative length that is equal to the font size of the root HTML element which for most browsers is 16px. |
| Remote playback | 121 | 13.1 | limited | The Remote Playback API initiates and controls playback of media on connected remote devices, such as smart TVs with AirPlay or Chromecast capabilities. |
| Reporting API | 96 | 16.4 | newly | The Reporting-Endpoints HTTP header and ReportingObserver() API send selected reports, such as Content Security Policy (CSP) violation reports or crash reports, to a nominated URL or callback function. |
| COEP violation reports | 96 | 16.4 | limited | COEP violation reporting sends a report to a URL nominated by the Reporting-Endpoints header or the ReportingObserver API when a page violates its Cross-Origin-Embedder-Policy policy. |
| CSP violation reports | 74 | 18.4 | newly | CSP violation reporting sends a report to a URL nominated by the Reporting-Endpoints header or the ReportingObserver API when a page violates its content security policy. |
| requestAnimationFrame() | 24 | 7 | widely | The requestAnimationFrame() method schedules a function that runs before the next repaint. You can use it to animate content with JavaScript. |
| requestAnimationFrame() in workers | 69 | 16.4 | widely | The requestAnimationFrame() method in workers schedules a function that runs before the next repaint. Together with offscreen canvas, you can animate content from a worker. |
| requestVideoFrameCallback() | 83 | 15.4 | newly | The requestVideoFrameCallback() method for <video> schedules a function that runs with the next video frame. It is similar to requestAnimationFrame(), but for video. |
| dialog.requestClose() | 134 | 18.4 | newly | The requestClose() method of a <dialog> HTML element closes the dialog, firing a cancel event first, which listeners can use to prevent the dialog from closing. This differs from the close() method, which only fires the non-cancelable close event. |
| Resizable buffers | 111 | 16.4 | newly | The resize() method of an ArrayBuffer and the grow() method of a SharedArrayBuffer, constructed with the maxByteLength option, changes the size of the buffer in place. |
| resize (CSS property) | 4 | 4 | limited | The resize CSS property sets whether an element can be resized by the user, and on which axes. |
| Resize observer | 64 | 13.1 | widely | The ResizeObserver API observes and reacts to changes in the size of DOM elements. |
| resolution media query | 68 | 16 | widely | The resolution CSS media query sets styles based on the pixel density, or how many pixels a device uses to display a single CSS pixel. |
| resolution media query (compatibility prefixes) | 1 | 3 | widely | The -webkit-device-pixel-ratio, -webkit-min-device-pixel-ratio, and -webkit-max-device-pixel-ratio CSS media queries are standardized compatibility alternatives to resolution media queries. |
| Resource size | 54 | 16.4 | widely | The decodedBodySize, encodedBodySize, and transferSize properties of the PerformanceResourceTiming API reports the size of resources loaded. |
| Resource timing performance entries | 29 | 11 | widely | A resource performance entry records when a network event happens while loading a resource, such as when a connection starts and ends. You can use this information to measure loading times. |
| revert | 84 | 9.1 | widely | The revert CSS keyword resets any property to its previous default, provided by either the user or browser stylesheets. For example, setting display: revert on a <div> will likely result in display: block, the browser default style. This is often confused with initial. |
| rex unit | 111 | 17.2 | newly | The rex CSS length unit is a font-relative length that is equal to the x-height of the root element. |
| RGB | 65 | 12.1 | widely | The rgb(), rgba(), and hexadecimal (as in #004488ff) notations pick colors using red, green, blue, and alpha (transparency) channels. |
| ric unit | 111 | 17.2 | newly | The ric CSS length unit, or root international character, is a font-relative length equal to the width of CJK character relative to the root element. |
| rlh unit | 111 | 16.4 | widely | The rlh CSS length unit is a font-relative length relative to the line height of root element. |
| :root | 1 | 1 | widely | The :root pseudo-class matches the root element of the document, usually the <html> element. |
| round(), mod(), and rem() | 125 | 17.2 | newly | The round(), mod(), and rem() CSS functions compute rounded values and the remainder after division. |
| <ruby> | 5 | 5 | widely | The <ruby> element produces small annotations that are rendered with its base text. |
| ruby-align | 128 | 18.2 | newly | The ruby-align CSS property sets the spacing and alignment of ruby annotation text when it does not fill its available space. |
| ruby-position | 84 | 18.2 | newly | The ruby-position CSS property sets the position of a ruby annotation in relation to its base text. Annotations can display over, under, or interleaved with the base text. |
| <s> | 1 | ≤4 | widely | The <s> HTML element indicates text that is no longer relevant or accurate, styling text as strikethrough by default. |
| Safe area inset environment variables | 69 | 11.1 | widely | The safe-area-inset- CSS environment variables represent a rectangle that cannot cut off content within a non-rectangular screen. For example, top:\ env(safe-area-inset-top); positions the top of an element below the notch on an iPhone. |
| <samp> | 1 | ≤4 | widely | The <samp> element represents a sample or quoted output from a computer program. Styled in a monospace font by default. |
| @scope | 143 | 26.4 | newly | The @scope CSS at-rule sets the scope for a group of rules. |
| :scope (pseudo-class) | 27 | 7 | widely | The :scope CSS pseudo-class matches the scoping root, for instance the element that querySelector() is called on, or the root of a DOM subtree specified with @scope. |
| Scoped custom element registries | 146 | 26 | limited | The CustomElementRegistry() constructor creates a new custom element registry that's separate from the global window.customElements registry. Creating more than one registry is useful for multiple custom elements that have the same tag name to coexist. |
| Screen | 1 | 1 | widely | The window.screen property contains information about the screen of the output device that the referenced window is being rendered on. |
| Screen capture | 72 | 13 | limited | The navigator.mediaDevices.getDisplayMedia() method asks the user to choose a screen or portion of a screen (such as a window) to capture as a media stream. |
| Screen orientation | 38 | 16.4 | widely | The screen.orientation API gets information about the orientation of the viewport, such as landscape or portrait. With this API, you can adapt an application's layout or behavior in response to changes in orientation. |
| Screen wake lock | 84 | 16.4 | newly | The navigator.wakeLock.request("screen") API prevents the device's screen from dimming or being turned off. |
| <script> and <noscript> | 1 | 3 | widely | The <script> element contains or loads data or executable code. This is typically used to load JavaScript code. The <noscript> element represents alternative content to show when scripting is not allowed. |
| scripting media query | 120 | 17 | widely | The scripting CSS media query sets styles based on whether scripting such as JavaScript is available. Values are enabled if scripting is available, initial-only if scripting is only available on page load (for example, printed content), or none. |
| scroll-behavior | 61 | 15.4 | widely | The scroll-behavior CSS property controls whether scrolling is smooth or snaps, for scroll actions not performed by the user such as those triggered by navigation. |
| Scroll-driven animations | 115 | 26 | limited | The animation-timeline, scroll-timeline, and view-timeline CSS properties advance animations based on the user's scroll position. |
| Scroll methods on elements | 61 | 14 | widely | The scroll() and scrollBy() methods change the scroll position of overflow content within an element. Similar to setting scrollTop and scrollLeft properties, but with options setting whether the scroll should animate smoothly or jump. Note that scrollTo() is an alias for scroll(). |
| scrollIntoView() | 1 | 3 | widely | The scrollIntoView() method scrolls an element's ancestor containers such that the element is visible to the user. |
| Scroll snap | 69 | 11 | widely | CSS scroll snap controls the panning and scrolling behavior within a scroll container. |
| Scroll to text fragment | 80 | 16.1 | newly | Text fragments are URL fragments on the form #:~:text=snippet and link to a snippet of text within a page. The browser may scroll, highlight, or otherwise bring that text to the reader's attention. |
| scrollbar-color | 121 | 26.2 | newly | The scrollbar-color CSS property sets the color of the scrollbar track and thumb. |
| scrollbar-gutter | 94 | 18.2 | newly | The scrollbar-gutter CSS property reserves space for the scrollbar, preventing unwanted layout changes as the scrollbar appears and disappears. |
| scrollbar-width | 121 | 18.2 | newly | The scrollbar-width CSS property sets the width of the scrollbar. |
| scrollend | 114 | 26.2 | newly | The scrollend event fires when an element or document has finished scrolling. |
| <search> | 118 | 17 | widely | The <search> HTML element is a container that represents the parts of the web page with search functionality. |
| <input type="search"> | 5 | 5 | widely | The <input type="search"> HTML element represents a text field for search queries. |
| <section> | 5 | 5 | widely | The <section> element is a generic standalone section of a document, which doesn't have a more specific semantic element to represent it. |
| <select> | 1 | 1 | widely | The <select> element provides a menu of options for a user to pick from, typically rendered as a dropdown list. |
| ::selection | 1 | 1.1 | limited | The ::selection CSS pseudo-element selects text a user has highlighted. |
| Selection | 11 | 5.1 | widely | The Selection API controls and modifies user text selections within the page. |
| Selectors (core) | 1 | 3 | widely | CSS selectors match elements based on their type, attributes, and relationship to other elements. They define the specific elements to which a block of styles will be applied. This feature represents the oldest selectors of CSS. |
| Server-sent events | 6 | 5 | widely | The EventSource API creates a connection to a server and listens to a stream of events sent by the server. |
| Server timing | 65 | 16.4 | widely | The serverTiming property of a resource performance entry contains server timing information about network requests. |
| Service workers | 45 | 11.1 | widely | The service worker of a website is a script that runs in its own thread and which acts as local proxy that intercepts network requests from the website. Use a service worker to implement advanced caching strategies, offline support, background tasks, or push notification support on your website. |
| Service workers static routing | 123 | 27 | limited | The service worker install event's addRoutes method declares resource paths that should either be fetched from the network or the cache, to bypass the service worker and improve performance. |
| Set (initial support) | 38 | 8 | widely | Set objects store unique values of any type. |
| Set methods | 122 | 17 | newly | The difference(), intersection(), isDisjointFrom(), isSubsetOf(), isSupersetOf(), symmetricDifference(), and union() methods of the JavaScript Set object performs operations between two sets. |
| setInterval | 3 | 4 | widely | The setInterval() global function repeatedly executes provided code on a given delay, and the accompanying clearInterval() cancels the interval. |
| setTimeout() | 3 | 4 | widely | The setTimeout() global function executes provided code after a given duration of time, and the accompanying clearTimeout() cancels the timer. |
| Shadow DOM | 53 | 10 | widely | Shadow DOM allows you to attach encapsulated "shadow" DOM trees to elements. A shadow DOM tree is a separate component, isolated from the scripts and styles in other parts of the document. This is a part of Web Components. |
| Shadow parts | 73 | 13.1 | widely | The part and exportparts HTML attributes expose elements of a shadow DOM as named parts, which can be selected by the ::part() CSS pseudo-element for styling. |
| shape() | 135 | 18.4 | newly | The shape() CSS function creates shapes with a series of commands like line, move, and curve. It can be used with clip-path and shape-outside. |
| shape-outside | 37 | 10.1 | widely | The shape-outside CSS property, along with shape-margin and shape-image-threshold, sets the shape around which adjacent content will wrap. |
| shapes | 37 | 10.1 | widely | The circle(), ellipse(), inset(), and polygon() CSS shape functions create shapes for use with clip-path and shape-outside. |
| navigator.share() | 128 | 12.1 | limited | The navigator.share() method invokes the device's native sharing mechanism and passes text, links, files, and other content to share targets. Also known as the Web Share API. |
| SharedArrayBuffer and Atomics | 68 | 15.2 | widely | The SharedArrayBuffer object represents bytes shared between multiple workers and the main thread. The Atomics object safely accesses SharedArrayBuffer data to make sure predictable values are read and written and that operations are not interrupted. |
| Shared worker | 5 | 16 | newly | The SharedWorker() constructor runs a script in its own thread, which can send and receive messages with other scripts running at the same origin. |
| showPicker() for <input> | 99 | 17.4 | limited | The showPicker() method for <input> elements shows the user interface for picking a value. For example, for <input type="date"> it shows the interface for picking a date. |
| sibling-count() and sibling-index() | 138 | 26.2 | newly | The sibling-count() and sibling-index() CSS functions return integers that are useful to style elements based on their positions among siblings or on the number of siblings, for example as part of a calc() expression. |
| <slot> | 53 | 10 | widely | The <slot> HTML element is a placeholder inside a web component where consumers of the component can insert their own markup. |
| Imperative slot assignment | 92 | 16.4 | widely | The assign() method for <slot> elements assigns nodes to the slot, as an alternative to using the slot and name HTML attributes. The nodes must be children of a shadow host and the shadow root must be created with the slotAssignment set to "manual". Also known as manual slot assignment. |
| <small> | 1 | ≤4 | widely | The <small> element represents side-comments and small print, like copyright and legal text, independent of its styled presentation. Styled in a reduced font size by default. |
| SMIL SVG animations | 19 | 6 | widely | The <animate>, <animateMotion>, and <animateTransform> SVG elements declaratively animate SVG elements. Also known as SMIL. |
| <source> | 3 | 3.1 | widely | The <source> element sets a media resource for the <picture>, <video>, and <audio> elements. |
| Sourcemap header | 18 | 7 | widely | The Sourcemap HTTP response header links generated code to a source map, so the browser shows the original source in a debugger. This makes it easier to work with minified or transpiled code. |
| <span> | 1 | 1 | widely | The <span> HTML element is the generic inline container for content. |
| Speech synthesis | 33 | 7 | widely | The SpeechSynthesis API converts text to speech with artificial voices. |
| spellcheck | 9 | 5.1 | widely | The spellcheck global HTML attribute sets whether the browser may check an element for spelling errors. |
| ::spelling-error and ::grammar-error | 121 | 17.4 | limited | The ::spelling-error and ::grammar-error CSS pseudo-elements match text that is highlighted as misspelled and grammatically incorrect, respectively. |
| Spread syntax | 60 | 11.1 | widely | The spread (...) syntax allows an iterable, such as an array or string, to be expanded in places where zero or more arguments (for function calls) or elements (for array literals) are expected. |
| srcset and sizes | 38 | 10.1 | widely | The srcset and sizes attributes for <img> elements set a list of possible sources for the image and a corresponding list of size conditions for choosing a source, to show a responsive image that fits the size of the display. |
| Stable array sort | 70 | 10.1 | widely | Stable array sort() function |
| @starting-style | 117 | 17.5 | newly | The @starting-style CSS at-rule sets the starting values for properties that are transitioning when the target element's style is first updated. |
| :state() | 125 | 17.4 | newly | The :state() CSS pseudo-class matches custom elements based on their custom state, set through the ElementInternals.states API. |
| Static positioning | 1 | 1 | widely | The position: static CSS declaration positions an element in the normal flow. A statically positioned element ignores physical and logical properties such as top or inset-block-start. |
| steps() easing | 77 | 14 | widely | The steps() CSS easing function divides an animation or transition into equidistant intervals, jumping from value to value. The step-start and step-end keyword values are presets with a single interval. |
| Sticky positioning | 56 | 13 | widely | The position: sticky CSS declaration positions an element in the normal flow until it crosses a specified threshold, at which points it becomes fixed (stuck) at that position. |
| Storage access | 119 | 11.1 | widely | The document.requestStorageAccess() method allows content in iframes to request storing and reading cookies and other site data, while the document.hasStorageAccess() method checks if such access is granted. |
| Storage manager | 61 | 17 | widely | The navigator.storage API provides information about the availability and persistence of the data that a site stores on the device, by using APIs such as the Cache API or the IndexedDB API. |
| Streams | 67 | 14.1 | widely | The streams API creates, composes, and consumes continuously generated data. |
| stretch | 138 | 27 | limited | The stretch CSS keyword expands a box as needed to fit its contents until the maximum size is reached, without preserving the content's preferred aspect ratio. |
| String at() | 92 | 15.4 | widely | The at() method of strings returns the character (one UTF-16 code unit) at an index, including negative indices for getting the character relative to the end of the string. Also known as the relative indexing method. |
| String codePointAt() and fromCodePoint() | 41 | 9 | widely | The codePointAt() method returns the numeric value of the UTF-16 code point at an index of the string. The fromCodePoint() method returns a string created from one or more code points. |
| String includes() | 41 | 9 | widely | The includes() method of strings returns whether a search string appears within the string. |
| String matchAll() | 73 | 13 | widely | The matchAll() method of strings matches a string against a regular expression and returns an iterator of all results, including capturing groups. |
| String normalize() | 34 | 10 | widely | The normalize() method of strings returns a Unicode normal form of a string as a new string. More than one code point sequence can represent the same characters. You can use the normalize() method to find canonically or compatibly equivalent strings. |
| String padStart() and padEnd() | 57 | 10 | widely | The padStart() and padEnd() methods of strings return a string lengthened to a minimum number of characters by adding characters to the start or end of the string. |
| String raw() | 41 | 9 | widely | The String.raw() static method interpolates template literal substitutions, but ignores escape sequences. It is the tag function for template literals. |
| String repeat() | 41 | 9 | widely | The repeat() method of strings returns the original string repeated a number of times. |
| String replaceAll() | 85 | 13.1 | widely | The replaceAll() method of strings returns a new string where all matches of a pattern (a string or regular expression) have been substituted with a replacement string. |
| String startsWith() and endsWith() | 41 | 9 | widely | The startsWith() and endsWith() methods of strings returns whether a search string appears at the beginning or end of the provided string. |
| String substr() | 1 | 1 | limited | The substr() method of strings returns part of a string, starting from an index and ending a given number of characters after. |
| String trimLeft() and trimRight() | 4 | 5 | limited | The trimLeft() and trimRight() methods of strings return a new string with whitespace removed from the beginning or end of the string. They're aliases for trimStart() and trimEnd(). |
| String trimStart() and trimEnd() | 66 | 12 | widely | The trimStart() and trimEnd() methods of strings return a new string with whitespace removed from the beginning or end of the string. |
| String isWellFormed() and toWellFormed() | 111 | 16.4 | widely | The isWellFormed() method of strings returns a boolean indicating if the string contains any Unicode lone surrogates. The toWellFormed() method returns a new string where all lone surrogates are replaced by the Unicode replacement character. |
| String (initial support) | 1 | 1 | widely | The string type (and String object) represents a sequence of characters. |
| <strong> | 1 | ≤4 | widely | The <strong> HTML element brings attention to the content, styling text as bold by default. |
| structuredClone() | 98 | 15.4 | widely | The structuredClone() global method creates a deep copy of an object. Values that cannot be cloned can instead be transferred, making the original value no longer usable. |
| <style> | 1 | 1 | widely | The <style> element embeds an inline CSS stylesheet in a document. |
| style (attribute) | 1 | 1 | widely | The style global HTML attribute applies inline CSS styling declarations to individual elements. |
| <sub> and <sup> | 1 | ≤4 | widely | The <sub> and <sup> elements sets inline text to be displayed as subscript or superscript for solely typographical reasons. |
| Subgrid | 117 | 16 | widely | The subgrid value for the grid-template-columns and grid-template-rows properties allows a grid item to inherit the grid definition of its parent grid container. |
| Subresource integrity | 46 | 11.1 | widely | Subresource integrity verifies that a resource, such as script served from a content delivery network, matches a known cryptographic hash. Also known as SRI. |
| @supports | 28 | 9 | widely | The @supports at-rule applies styles based on a browser's support for CSS features, such as a CSS property and value. Also known as feature queries. |
| @supports (compatibility prefix) | 2 | 4 | widely | The @supports (-webkit-transform-3d) CSS media query is a standardized compatibility alternative to @supports (transform-style). |
| SVG | 1 | 3 | widely | The SVG image format, represented by the <svg> element, creates two-dimensional vector graphics with declarative or scripted interaction and animation. |
| SVG filters | 5 | 6 | widely | The <filter> SVG element applies custom effects such as color manipulation, blurring, or morphing to SVG elements. |
| Symbol | 38 | 9 | widely | A Symbol value is a unique, non-enumerable primitive value used for encapsulation or information hiding. For example, a symbol can be a key of an object that can never collide with any other key. |
| System colors | 1 | 1 | widely | The system color CSS keywords, such as ButtonBorder or LinkText, allow you to match default colors from the user agent. |
| tab-size | 42 | 13.1 | widely | The tab-size CSS property sets the width of the tab character. |
| tabindex | 1 | 3.1 | widely | The tabindex HTML attribute make an element focusable, and sets the element's relative ordering for sequential focus navigation. |
| Tables | 1 | 1 | widely | The <table> HTML element, with several related elements, represents tabular data in rows and columns of cells. |
| :target | 1 | 1.3 | widely | The :target CSS pseudo-class matches the element with an ID matching the URL fragment. |
| ::target-text | 89 | 18.2 | newly | The ::target-text pseudo-element allows you to style text highlighted by a URL text fragment such as #:~:text=snippet. |
| <template> | 26 | 8 | widely | The <template> HTML element holds HTML fragments which you can clone and insert into the document using JavaScript. |
| Template literals | 62 | 11 | widely | Template literals are literals delimited with backtick (`) characters, allowing for multi-line strings, string interpolation with embedded expressions, and special constructs called tagged templates. |
| text-align | 1 | 1 | widely | The text-align CSS property sets the horizontal placement of the inner content of a block element. |
| text-align-last | 47 | 16 | widely | The text-align-last CSS property sets the alignment of the last line of text before a forced line break. |
| text-box | 133 | 18.2 | limited | The text-box CSS property sets the spacing above and below text based on a font's typographic features. For example, text-box: trim-both ex alphabetic trims the top to the top of the letter x and the bottom to the bottom of most letters, without descenders. |
| text-combine-upright | 48 | 15.4 | widely | The text-combine-upright CSS property displays multiple characters in the space of a single character in vertical text. This is used in East Asian documents to display Latin-based strings such as components of a date or letters of an initialism. |
| text-decoration | 1 | 1 | widely | The text-decoration CSS property sets the style and color of decorative lines including underline, overline, line-through, or a combination of lines. |
| text-decoration-line: blink | 57 | 12.1 | limited | The text-decoration: blink CSS declaration flashes text between visible and invisible. |
| text-decoration-skip-ink | 64 | 15.4 | widely | The text-decoration-skip-ink CSS property sets whether underlines and overlines may be interrupted where the line would cross a glyph. |
| text-decoration-skip-ink: all | 148 | 15.4 | newly | The text-decoration-skip-ink: all CSS declaration forces interruptions in underlines and overlines where the line would cross a glyph. This contrasts with auto, which does not skip for CJK glyphs. |
| Spelling and grammar text decorations | 121 | 26.2 | newly | The text-decoration-line: spelling-error and text-decoration-line: grammar-error CSS declarations apply the browser's marking for spelling and grammatical mistakes. This is typically a wavy underline in red or green. |
| text-emphasis | 99 | 7 | widely | The text-emphasis CSS property sets position and style for text emphasis marks, especially for East Asian languages. |
| Text encoding and decoding | 38 | 10.1 | widely | The TextEncoder API transforms a stream of code points into a byte stream with UTF-8 encoding, and TextDecoder does the reverse. |
| text-indent | 1 | 1 | widely | The text-indent CSS property sets the size of the empty space (indentation) at the beginning of lines in a text. |
| text-indent: each-line | 146 | 15 | newly | The text-indent: each-line CSS declaration indents text after forced breaks as well as to the first line of a block. |
| text-indent: hanging | 146 | 15 | newly | The text-indent: hanging CSS declaration indents all lines except the first. |
| text-orientation | 48 | 14 | widely | The text-orientation CSS property sets the how text is typeset within a line when the writing mode is vertical. |
| Text overflow | 1 | 1.3 | widely | The text-overflow CSS property sets how hidden overflow content appears to users. The property can clip content, truncate content with an ellipsis (…), or truncate with a custom string. |
| text-shadow | 2 | 1.1 | widely | The text-shadow CSS property sets the position and styles of shadow on text. |
| Text stroke and fill  (compatibility prefixes) | 4 | 3 | widely | The -webkit-text-stroke-width and -webkit-text-stroke-color CSS properties set the thickness and color of text outlines. The -webkit-text-fill-color sets the color within text character outlines. Both default to the text color. |
| Text tracks | 23 | 6 | widely | The <track> element is used as a child of the media elements that lets you specify a timed text track to be displayed in parallel with the media element. |
| text-transform | 1 | 1 | widely | The text-transform CSS property sets text case and capitalization. |
| text-underline-offset | 87 | 12.1 | widely | The text-underline-offset CSS property shifts underlines on text from the initial position by a given distance. The initial position is affected by the text-underline-position property. |
| text-underline-position | 33 | 12.1 | widely | The text-underline-position CSS property sets the position of underlines on text. For example, text-underline-position: under places the underline below the text, avoiding crossing descenders. The underline may be further adjusted by the text-underline-offset property. |
| text-wrap | 130 | 17.5 | newly | The text-wrap CSS property sets how lines break in text that overflows the container. It is a shorthand for text-wrap-style and text-wrap-mode. |
| text-wrap: balance | 114 | 17.5 | newly | The text-wrap: balance CSS declaration balances the length of each line when text is broken into multiple lines. Also known as headline balancing. |
| text-wrap: pretty | 117 | 26 | limited | The text-wrap: pretty CSS declaration prioritizes better layout over speed when text is broken into multiple lines. |
| <textarea> | 1 | ≤4 | widely | The <textarea> element represents an editing control that allows users to enter multi-line, free-form, plain text. |
| <time> | 62 | 10 | widely | The <time> HTML element represents a time, such as a calendar date, clock time, or duration. It may include the datetime attribute to translate dates into machine-readable format. |
| Time-relative pseudo-selectors | 23 | 7 | limited | The :past and :future CSS pseudo-classes match prior or upcoming text track cues during media playback. |
| <title> | 1 | 1 | widely | The <title> element sets the title of the document and exposes it to users via the UI of the browser or app they're using and through assistive technology. |
| title (attribute) | 1 | ≤4 | widely | The title global HTML attribute sets information about an element, such as a name or description. The value is typically shown as a tooltip that appears on mouse over. Since it's not often available to touch-only, keyboard-only, or assistive technology users, it's not a substitute for other text. |
| ToggleEvent source | 140 | 26.5 | newly | The source property of a ToggleEvent object is the element which triggered the toggle event to fire for a popover, <dialog>, or <details> element, if applicable. |
| Top-level await | 89 | 27 | newly | The await keyword, when used at the top level of a module (outside of an async function), delays parent module execution until after a promise fulfills. |
| touch-action | 36 | 13 | widely | The touch-action CSS property sets whether an element on a touch screen can be panned or pinched to zoom. |
| Transferable ArrayBuffer | 114 | 17.4 | widely | The transfer() and transferToFixedLength() methods of ArrayBuffer move a buffer from one context to another (for example, to a worker). |
| transform-box | 118 | 13.1 | newly | The transform-box CSS property sets the position and dimensions of the reference box relative to which an element's transformations are calculated. |
| 2D transforms | 36 | 9 | widely | The transform CSS property and its 2D transform functions allow rotating, scaling, skewing, and translating an element. Arbitrary 2D transforms are also possible using a transformation matrix. |
| 3D transforms | 36 | 15.4 | widely | The transform CSS property and its 3D transform functions allow rotations and other transforms in three dimensions, including perspective transforms. |
| transition-behavior | 117 | 17.4 | newly | The transition-behavior: allow-discrete CSS declaration allows transitions for properties whose animation behavior is discrete. Such properties can't be interpolated and swap from their start value to the end value at 50%. |
| Transitions (CSS) | 26 | 9 | widely | The transition shorthand CSS property sets how changes to an element's styles may occur over time. Transitions can be applied to specific CSS properties, all properties, or none. |
| translate | 19 | 6 | widely | The translate HTML attribute marks whether an element's text should be translated. |
| Trigonometric functions (CSS) | 111 | 15.4 | widely | The sin(), cos(), tan(), asin(), acos(), atan(), and atan2() CSS functions compute various trigonometric functions. |
| Trusted types | 83 | 26 | newly | Trusted types allow you to lock down insecure parts of the DOM API and prevent client-side cross-site scripting (XSS) attacks. |
| Two-value display property | 115 | 15 | widely | The display CSS property accepts multiple keyword values, such as inline flex or block flow, to explicitly set an element's inner and outer layout mode. Also known as 2-value, multi-keyword, or multiple value syntax. |
| Typed array iteration methods | 45 | 10 | widely | Typed array iteration methods |
| Typed array iterators | 45 | 10 | widely | Typed arrays are iterable with the for … of statement and enumerable with the methods entries(), keys(), and values(). |
| Typed arrays (initial support) | 7 | 5.1 | widely | Typed arrays are ordered lists of JavaScript values, where all values are of the same numerical type, such as 8-bit integers or 32-bit floating point numbers. |
| <u> | 1 | 1 | widely | The <u> HTML element makes non-textual annotations, styling text as underlined by default. |
| Uint8Array base64 and hex conversion | 140 | 18.2 | newly | The Uint8Array.fromBase64() static method and the toBase64() and setFromBase64() instance methods convert to and from base64 strings. Similarly, the Uint8Array.fromHex() static method and the toHex() and setFromHex() instance methods convert to and from hex strings. |
| Unicode point escapes | 44 | 9 | widely | Unicode point escapes (\\u{}) represent Unicode characters within strings. |
| unset | 41 | 9.1 | widely | The unset keyword resets any CSS property, removing any values previously set by the author, user, or browser. Inherited properties (like color) reset to the parent element's computed value. Non-inherited properties (like display) reset to the specified initial value (inline). |
| Update frequency media query | 113 | 17 | widely | The update CSS media query sets styles based on whether and how fast the user's device can modify display after it has been rendered. For example, you can avoid animations on devices that aren't fast enough to display them smoothly. |
| Upgrade insecure requests | 44 | 10.1 | widely | The Upgrade-Insecure-Requests HTTP request header tells the server that the response should redirect to a secure (HTTPS) resource. |
| URL | 32 | 7 | widely | A URL object represents a web address, like https://example.com/, and parts of the address, such as the domain, path, and query string (as URLSearchParams). |
| URL.canParse() | 120 | 17 | widely | The URL.canParse() static method checks whether a URL can be parsed into a valid URL object. It's an alternative to calling new URL() in a try … catch statement. |
| cross-origin() for url() | 150 | 26.2 | limited | The url() CSS function accepts a cross-origin() modifier to control cross-origin resource sharing (CORS) when requesting the URL. For example, url("https://example.com" cross-origin(anonymous))) does not send credentials to the URL. |
| referrer-policy() for url() | 150 | 26.2 | limited | The url() CSS function accepts a referrer-policy() modifier to choose which referrer to send when requesting the URL. For example, `url("https://example.com" referrer-policy(no-referrer)) does not send a referrer to the URL. |
| URLPattern | 95 | 26 | newly | The URLPattern API creates patterns that can be matched against URLs or URL components. |
| User action pseudo-classes | 1 | 2 | widely | The :active, :focus, and :hover CSS pseudo-classes match elements based on how users are interacting with them. |
| User activation | 72 | 16.4 | widely | The navigator.userActivation API reveals whether the user has interacted with the page through an "activation" gesture such as a click, tap, or key press. User activation gated APIs (such as the fullscreen API) fail without user interaction, and this API allows you to predict such a failure. |
| User agent sniffing | 4 | 10 | widely | The navigator.userAgent property and several others loosely identify a browser. Selectively showing content based on the user agent string, also known as user agent sniffing, is unreliable. Consider using feature detection or user agent client hints instead. |
| :user-valid and :user-invalid | 119 | 16.5 | widely | The :user-valid and :user-invalid pseudo-classes match form controls that have been marked as valid or invalid based on their validation constraints. |
| <var> | 1 | ≤4 | widely | The <var> element represents the name of a variable in a mathematical expression or a programming context. |
| vertical-align | 1 | 1 | widely | The vertical-align CSS property sets the vertical alignment of inline, inline-block, and table cell elements. It has no effect on block-level elements. |
| Vertical form controls | 124 | 17.4 | newly | The writing-mode CSS property orients form elements (such as radio buttons, progress bars, or select menus) vertically when the writing mode is vertical-lr or vertical-rl. The direction CSS property sets whether inputs flow from top to bottom or bottom to top. |
| <video> | 3 | 3.1 | widely | The <video> element plays videos or movies, optionally with controls provided by the browser. |
| view-transition-class | 125 | 18.2 | newly | The view-transition-class CSS property sets a name that can be used to apply styles to multiple named view transition pseudo-elements. |
| View transitions | 111 | 18 | newly | View transitions allow you to create animated visual transitions between different states of a document. |
| Small, large, and dynamic viewport units | 108 | 15.4 | widely | The sv*, lv*, and dv* CSS viewport units are relative to the smallest, largest, and current (dynamic) viewport size. They are used to size elements in relation to the viewport's dimensions. |
| Viewport units | 26 | 7 | widely | The vw, vh, vmin, and vmax CSS viewport units are relative to the size of the viewport, and are used to size elements in relation to the viewport's dimensions. |
| visibility | 1 | 1.3 | widely | The visibility CSS property sets whether an element is shown. Invisible elements still affect the document layout. |
| Visual viewport API | 61 | 13 | widely | The visualViewport API provides a way to query and modify the user-visible viewport of a web page. |
| WebAssembly | 57 | 11 | widely | The WebAssembly.instantiate() and WebAssembly.instantiateStreaming() global static methods load WebAssembly code (also known as Wasm), a portable binary instruction format. |
| BigInt to i64 conversion (WebAssembly) | 85 | 14.1 | widely | Integer values pass bidirectionally between JavaScript and WebAssembly, converted to i64 values in WebAssembly or BigInt values in JavaScript. |
| Branch hinting (WebAssembly) | 137 | 16 | newly | Branch hints in WebAssembly allows a browser to optimize performance when a branch is a likely to take a specific path. |
| Bulk memory operations (WebAssembly) | 75 | 15.1 | widely | Bulk memory operations, such as copy and init, mirror the efficiency of native memcpy and memmove operations. |
| Exception handling (WebAssembly) | 95 | 15.2 | widely | Exceptions break the normal control flow of execution to represent exceptional behavior, such as an error. You can respond to the exception in JavaScript code. |
| Exception references with exnref (WebAssembly) | 137 | 18.4 | newly | When caught, an exception is reified into an exception reference, a value of the new type exnref. |
| Extended constant expressions (WebAssembly) | 114 | 17.4 | widely | The i32.add, i32.sub, i32.mul, i64.add, i64.sub, and i64.mul operations extend constant expressions to include arithmetic. |
| Garbage collection (WebAssembly) | 119 | 18.2 | newly | Garbage collection tracks references for better memory management with garbage-collected languages running in WebAssmbly. |
| JavaScript promise integration (WebAssembly) | 137 | 27 | newly | The JavaScript promise integration (JSPI) suspends a WebAssembly module when it calls a JavaScript method that returns a promise. The module resumes when the promise is resolved. You can use this to call asynchronous Web APIs from synchronous WebAssembly. |
| Multi-value (WebAssembly) | 86 | 13.1 | widely | Instructions and blocks can produce multiple result values. |
| Import and export of mutable globals (WebAssembly) | 74 | 13.1 | widely | Mutable global variables are importable and exportable. |
| Non-trapping float-to-int conversion (WebAssembly) | 75 | 15.1 | widely | Saturating floating-point to integer conversion operators return the maximum or minimum integer value on overflow instead of trapping. |
| Reference types (WebAssembly) | 96 | 15.1 | widely | The externref type can be both a value type and a table element type, while funcref can be a value type. |
| Sign extension operators (WebAssembly) | 69 | 14.1 | widely | Sign-extension operator instructions extend the width of 8-bit, 16-bit, and 32-bit values to 32-bit and 64-bit values. |
| Fixed-width SIMD (WebAssembly) | 91 | 16.4 | widely | 128-bit SIMD (Single Instruction Multiple Data) performs one instruction on multiple units of data, when running on hardware that supports such instructions. Also known as vector instructions. |
| Tail call optimization (WebAssembly) | 112 | 18.2 | newly | Tail call optimization discards a caller frame and replaces the call with a jump instruction. |
| Threads and atomics (WebAssembly) | 74 | 15.2 | widely | Threads in WebAssembly run code in parallel, while atomic memory instructions can guarantee that no two threads can read or write to shared memory at the same time. |
| Typed function references (WebAssembly) | 119 | 18 | newly | A typed function reference can be called directly. |
| <wbr> | 1 | 4 | widely | The <wbr> HTML element represents a word break opportunity, to explicitly mark a place within a word where a line might be broken. |
| Weak references | 84 | 14.1 | widely | The WeakRef and FinalizationRegistry objects hold references to garbage-collectable objects without creating strong references that prevent their garbage collection. |
| WeakMap | 36 | 8 | widely | A WeakMap object holds key-value pairs that do not create strong references to its keys, such that value data can be associated with a key without preventing garbage collection of the key. |
| WeakSet | 36 | 9 | widely | A WeakSet object stores unique values of any type without creating strong references to the values, such that membership in the set does not prevent garbage collection of the value. |
| Web animations | 84 | 14 | widely | The web animation API programmatically creates, inspects, and controls element animations, to change and synchronize appearance over time. |
| Web Audio | 35 | 14.1 | widely | The Web Audio API creates graphs of audio nodes that handle sound inputs, synthesize sounds, apply effects, create visualizations, and output to audio devices. |
| Web Cryptography | 37 | 11 | widely | The Web Cryptography API performs low-level cryptographic operations, such as encryption, decryption, and signature verification. Also known as the Web Crypto API. |
| Locks | 69 | 15.4 | widely | The navigator.locks API coordinates work with shared resources through mutually exclusive ownership of a resource's name. Also known as web locks. |
| WebOTP | 93 | 27 | limited | The OTPCredential API represents a one-time-password (OTP). |
| Web authentication | 67 | 13 | widely | The web authentication API allows you to create public key-based credentials and use them for authentication, such as when signing in. Also known as WebAuthn. |
| Web authentication easy public key access | 85 | 16 | widely | The getAuthenticatorData(), getPublicKey(), and getPublicKeyAlgorithm() methods of AuthenticatorAttestationResponse access credential data inside attestationObject without the need to parse it. |
| Web authentication signal methods | 132 | 26 | limited | The signalUnknownCredential(), signalAllAcceptedCredentials(), and signalCurrentUserDetails() methods of PublicKeyCredential inform authenticators of the state of public key credentials, so that incorrect or revoked credentials may be updated, removed, or hidden. |
| WebCodecs | 94 | 26 | limited | The WebCodecs API provides low-level access to individual video frames and chunks of audio samples, for full control over the way media is processed. |
| WebGL | 9 | 5.1 | widely | The WebGLRenderingContext API is the "webgl" rendering context for the <canvas> element. It represents a space for drawing two- and three-dimensional graphics and animations. |
| WEBGL_color_buffer_float WebGL extension | 63 | 14 | widely | The WEBGL_color_buffer_float extension for WebGL 1.0 contexts adds the 32-bit floating-point type RGBA32F as a color-renderable format. |
| Color management for WebGL | 104 | 16.4 | newly | The drawingBufferColorSpace and unpackColorSpace properties of WebGLRenderingContext sets the color representation for the buffer and imported textures, such as "srgb" or "display-p3". |
| WEBGL_compressed_texture_astc WebGL extension | 47 | 12 | widely | The WEBGL_compressed_texture_astc extension for WebGL 1.0 and 2.0 contexts adds the Adaptive Scalable Texture Compression format to compressedTexImage2D() and compressedTexSubImage2D(). |
| WEBGL_compressed_texture_etc WebGL extension | 63 | 13.1 | widely | The WEBGL_compressed_texture_etc extension for WebGL 1.0 and 2.0 contexts adds many ETC2 and EAC compressed texture formats to compressedTexImage2D() and compressedTexSubImage2D(). |
| WEBGL_compressed_texture_etc1 WebGL extension | 49 | 13.1 | widely | The WEBGL_compressed_texture_etc1 extension for WebGL 1.0 and 2.0 contexts adds the ETC1 compressed texture format to compressedTexImage2D() and compressedTexSubImage2D(). |
| WEBGL_compressed_texture_s3tc WebGL extension | 26 | 8 | limited | The WEBGL_compressed_texture_s3tc extension for WebGL 1.0 and 2.0 contexts adds S3TC compressed texture formats to compressedTexImage2D() and compressedTexSubImage2D(). |
| WEBGL_compressed_texture_s3tc_srgb WebGL extension | 60 | 14.1 | limited | The WEBGL_compressed_texture_s3tc_srgb extension for WebGL 1.0 and 2.0 contexts adds S3TC compressed texture formats for the sRGB colorspace to compressedTexImage2D() and compressedTexSubImage2D(). |
| WEBGL_debug_renderer_info WebGL extension | 33 | 9.1 | widely | The WEBGL_debug_renderer_info extension for WebGL 1.0 and 2.0 contexts exposes information about the graphics driver for debugging purposes. |
| WEBGL_debug_shaders WebGL extension | 47 | 14 | widely | The WEBGL_debug_shaders extension for WebGL 1.0 and 2.0 contexts adds the getTranslatedShaderSource() method to debug shaders from privileged contexts. |
| WEBGL_depth_texture WebGL extension | 26 | 8 | widely | The WEBGL_depth_texture extension for WebGL 1.0 contexts defines 2D depth and depth-stencil textures. |
| WEBGL_draw_buffers WebGL extension | 36 | 9 | limited | The WEBGL_draw_buffers extension for WebGL 1.0 contexts enables a fragment shader to write to several textures, which is useful for deferred shading, for example. |
| WEBGL_lose_context WebGL extension | 26 | 8 | widely | The WEBGL_lose_context extension for WebGL 1.0 and 2.0 contexts simulates losing and restoring a WebGLRenderingContext or WebGL2RenderingContext. |
| WEBGL_multi_draw WebGL extension | 86 | 15 | limited | The WEBGL_multi_draw extension for WebGL 1.0 and 2.0 contexts renders more than one primitive with a single function call. |
| OES_draw_buffers_indexed WebGL extension | 100 | 16 | widely | The OES_draw_buffers_indexed extension for WebGL 2.0 contexts allows you to control blending on a per-color basis when writing to multiple color buffers simultaneously. |
| WebGL2 | 56 | 15 | widely | The WebGL2RenderingContext API is the "webgl2" rendering context for the <canvas> element. It represents a space for drawing two- and three-dimensional graphics and animations. It corresponds to OpenGL ES 3.0. |
| Color management for WebGL2 | 104 | 16.4 | newly | The drawingBufferColorSpace and unpackColorSpace properties of WebGL2RenderingContext sets the color representation for the buffer and imported textures, such as "srgb" or "display-p3". |
| WebGPU | 144 | 26 | limited | The navigator.gpu API performs operations such as rendering and computation on dedicated graphics hardware (also known as a Graphics Processing Unit). |
| WebP | 32 | 14 | widely | The WebP image format is a raster graphics file format that supports animation, alpha transparency, and lossy as well as lossless compression. |
| WebRTC | 56 | 11 | widely | The WebRTC API establishes real-time communication channels directly between browsers. It is commonly used in video conferencing applications. |
| WebRTC encoded transform | 141 | 15.4 | newly | The WebRTC encoded transform API allows you to modify audio and video streams in WebRTC connections. For example, it can be used for visual effects or custom codecs. |
| WebRTC SCTP information | 76 | 15.4 | widely | The sctp object on RTCPeerConnection represents the negotiated SCTP transport. SCTP (Stream Control Transmission Protocol) is the protocol that RTCDataChannel uses. |
| WebRTC statistics | 58 | 11 | widely | The RTCPeerConnection.getStats(), RTCRtpSender.getStats(), and RTCRtpReceiver.getStats() methods return detailed information about the status, performance, network, and media for a given WebRTC connection. |
| WebSockets | 5 | 5 | widely | The WebSocket API opens a two-way communication channel between the user's browser and a server. |
| WebTransport | 97 | 26.4 | newly | The WebTransport API transmits data between a client and a server, by using the HTTP/3 protocol. |
| WebVTT | 23 | 6 | widely | WebVTT is a captions and subtitles format. WebVTT files are loaded using the <track> element, and the VTTCue API can be used to create or update cues dynamically. |
| WebVTT cue settings | 23 | 6 | widely | The VTTCue API updates various aspects of cues dynamically, such as alignment, size and position. |
| Wheel events | 31 | 7 | limited | The wheel event fires when the user moves a mouse wheel or similar spatially rotating input device. |
| :where() | 88 | 14 | widely | The :where() CSS functional pseudo-class takes a selector list as its argument, and matches any element that can be selected by one of the selectors in that list. It is functionally equivalent to the selectors in the list, but doesn't affect the CSS rule specificity. |
| white-space | 1 | 1 | widely | The white-space CSS property sets how white space is collapsed and how lines wrap. It is a shorthand for white-space-collapse and text-wrap-mode. |
| white-space-collapse | 114 | 17.4 | widely | The white-space-collapse CSS property sets whether new line characters are shown as line breaks, and whether multiple consecutive spaces are all displayed or combined. |
| Widows and orphans | 25 | 1.3 | limited | The widows and orphans CSS properties set the minimum lines included in a text fragment created by page, column, or region breaks. |
| Width and height | 1 | 1 | widely | The width and height CSS properties set the preferred physical size of an element. |
| will-change | 36 | 9.1 | widely | The will-change CSS property gives hints to the browser about expected changes to an element's scroll position, contents, or style. These hints allow browsers to optimize for upcoming style changes. |
| Window | 1 | 1 | widely | The window global object represents a browser tab or iframe and its relationship to the document and other tabs. It's also a generic global object, under which many other APIs are located. |
| with | 38 | 10 | limited | The with JavaScript statement adds a given object to the chain of scopes used to evaluate names. |
| word-break | 44 | 9 | widely | The word-break CSS property sets how lines break within words. |
| word-break: break-word | 1 | 3 | limited | The word-break: break-word CSS declaration sets word breaks to occur according to their customary rules. |
| word-spacing | 1 | 1 | widely | The word-spacing CSS property sets the amount of white space between words. |
| writing-mode | 48 | 10.1 | widely | The writing-mode CSS property sets whether text is laid out horizontally or vertically, and left to right, or right to left. |
| writing-mode SVG 1.1 values | 48 | 10.1 | limited | The lr, lr-tb, rl, rl-tb, tb, and tb-rl keyword values for the writing-mode CSS property set the text direction for elements in SVG 1.1 documents. |
| writingsuggestions | 124 | 18 | limited | The writingsuggestions HTML attribute turns on or off a browser's writing suggestions. Writing suggestions vary by browser. For example, if turned on then a browser might show inline text completions accepted by pressing Tab. |
| X-Frame-Options | 4 | 4 | widely | The X-Frame-Options HTTP header limits where a document may be embedded in an iframe. The X-Frame-Options: SAMEORIGIN header disallows embedding in another origin. The X-Frame-Options: DENY header disallows embedding in any context, regardless of origin. |
| XMLHttpRequest | 1 | 3 | widely | The XMLHttpRequest API makes HTTP requests. It's the predecessor to fetch(). Also known as XHR. |
| XMLSerializer | 1 | 3 | widely | The XMLSerializer API provides the serializeToString() method to construct an XML string representing a DOM tree. |
| XPath | 1 | 3 | widely | The document.evaluate() method selects elements in an HTML or XML document based on an expression of XPath, a domain specific language for querying XML documents. Also known as XML Path Language. |
| XSLT | 1 | 3.1 | limited | The XSLTProcessor API transforms XML documents into new XML or HTML documents, using XSLT stylesheets. You can use XSLT to convert data between different XML schemas or to convert XML data into web pages or PDF documents. Also known as Extensible Stylesheet Language Transformations. |
| z-index | 1 | 1 | widely | The z-index CSS property orders overlapping elements, with higher values appearing in front of or on top of lower values. |
| zoom | 1 | 3.1 | newly | The zoom CSS property scales the size of an element. Unlike the transform property, a zoomed element affects page layout. |
| Zstandard compression | 123 | 26.3 | newly | Zstandard or zstd is a fast lossless compression algorithm. When used as a content encoding, it is often faster and offers better compression than brotli. |

## Chrome only (230)

| Feature | Chrome | Safari | Baseline | Summary |
| --- | --- | --- | --- | --- |
| Accelerometer | 91 | — | limited | The Accelerometer, LinearAccelerationSensor and GravitySensor APIs read the acceleration applied to a device in three dimensions, either including the effect of gravity, without its effect, or only its effect, respectively. |
| File handlers | 102 | — | limited | The file_handlers web app manifest member registers an installed web app as a handler for files with specific file extensions or MIME types. |
| Launch handler | 110 | — | limited | The launch_handler web app manifest member, with the client_mode property, configure how web app launches behave when an instance of the app is already open. For example, you can choose to focus the existing app instance instead of launching a new one. |
| Web app origin migration | 149 | — | limited | The migrate_to and migrate_from web app manifest members move an installed app from one origin to another, within the same site. They preserve the user's installation settings on the device, like shortcuts. |
| Protocol handlers | 96 | — | limited | The protocol_handlers web app manifest member registers an installed web app as a handler for a specific protocol. When a user follows a link with the specified protocol, the installed app opens the link. |
| Share targets | 89 | — | limited | The share_target web app manifest member registers an installed web app as a handler for shared content. When a user shares content by using the device share dialog, the installed app can be listed as an option for handling the shared content. |
| attr() | 133 | — | limited | The attr() CSS function, in the context of any property, returns the value of an attribute of an HTML element, with the option to return it as a specific type or unit. You can set a default value for missing or invalid attributes. |
| Attribution reporting | 133 | — | limited | The attribution reporting API measures when an ad click or view leads to a conversion, such as a purchase on an advertiser site. |
| autocapitalize | 66 | — | limited | The autocapitalize global HTML attribute sets the virtual keyboard capitalization behavior for user input on an element, such as the first letter of sentences or all words. |
| Background fetch | 74 | — | limited | Background fetch downloads data in the background even when the web page is closed. |
| Background sync | 49 | — | limited | The background synchronization API registers a service worker callback to run only when the device is no longer offline. You can use this to let users continue using your app while offline and synchronize with a server after reconnecting. |
| baseline-source | 111 | — | limited | The baseline-source CSS property controls how inline-level boxes with multiple lines of text are aligned with the surrounding text. By default, which typographic baseline is used depends on the display property value. |
| Battery status | 38 | — | limited | The navigator.getBattery() API obtains information about the device's battery, including charge level and status. Also known as the Battery API. |
| beforeinstallprompt | 76 | — | limited | The beforeinstallprompt event fires when a Progressive Web App (PWA) is installable. You can cancel the event and later call event.prompt() to control when the installation prompt is shown. The appinstalled event fires when the PWA is successfully installed. |
| Back/forward cache blocking reasons | 125 | — | limited | The notRestoredReasons property of a PerformanceNavigationTiming object explains why the current document was blocked from using the back/forward cache (also known as the bfcache) on navigation. |
| border-shape | 147 | — | limited | The border-shape CSS property sets the geometry of the border box, changing the shape of any applicable border, border image, focus outline, or shadow. |
| box-decoration-break | 130 | — | limited | The box-decoration-break CSS property sets whether box decorations, such as borders or backgrounds, of an element divided across a page, column, or region wraps each fragment or splits across the break. |
| calc-size() | 129 | — | limited | The calc-size() CSS function computes mathematical expressions that include height and width keyword values, for example calc-size(fit-content, size / 2). Not to be confused with the calc() CSS function, which cannot use keyword values. |
| 2D canvas opacity | 32 | — | limited | The optional alpha parameter of a 2D canvas's getContext() method sets whether the canvas has an alpha transparency channel. If set to false, then this permits the browser to optimize compositing for an opaque canvas. |
| contextlost and contextrestored | 99 | — | limited | The contextlost event for <canvas> fires when the canvas backing storage is lost, while the contextrestored event fires when it is recreated. |
| Capture Handle | 102 | — | limited | The capture handle API allows you to share a custom handle (a string) from a web application being captured by getDisplayMedia() to the capturing web application. |
| captureStream() for <audio> and <video> | 62 | — | limited | The captureStream() method for <audio> and <video> elements returns a MediaStream for the media element's content. You can use this to record media or send it elsewhere, such as a canvas or WebRTC connection. |
| caret-shape | 144 | — | limited | The caret-shape CSS property sets the shape of the insertion caret, the symbol that shows where the next character is to be inserted or deleted. |
| Custom formats for clipboard items | 104 | — | limited | The web prefix for ClipboardItem data types (also known as MIME types) allows reading and writing unsanitized custom data from the device clipboard. |
| SVG clipboard items | 124 | — | limited | The image/svg+xml data type (also known as the MIME type) for ClipboardItem objects represents SVG data written to or read from the clipboard. |
| Read unsanitized clipboard data | 122 | — | limited | The optional formats.unsanitized parameter of the navigator.clipboard.read() method reads unsanitized text/html data from the system clipboard. |
| clipboardchange | 144 | — | limited | The clipboardchange event for navigator.clipboard fires when the user modifies the clipboard's contents. |
| CloseWatcher | 126 | — | limited | The CloseWatcher API listens and responds to close requests on in-page components, such as modals, popovers, and sidebars. |
| COLRv1 | 98 | — | limited | COLRv1 is a font format that supports multi-color glyphs. COLRv1 extends COLRv0 to support gradients, transforms, and blending modes. |
| Column breaks | 102 | — | limited | In columnar layouts (created by the columns or column-count CSS properties), the break-after, break-before, break-inside properties control where columns start or end. |
| ::column | 135 | — | limited | The ::column CSS pseudo-element represents the individual columns of a multi-column layout container. Columns can only be styled with scroll snap CSS properties and can also have a ::scroll-marker pseudo-element, which scrolls to the column when activated. |
| Compression Dictionary Transport | 130 | — | limited | Compression Dictionary Transport is a mechanism for using designated HTTP responses as an external dictionary for future HTTP responses for compression schemes that support using external dictionaries (e.g., Brotli and Zstandard) |
| CPU compute pressure | 125 | — | limited | The PressureObserver API monitors CPU load, allowing you to adjust workloads in response to available computing resources. Also known as the Compute Pressure API. |
| Connection allowlists | 152 | — | limited | The Connection-Allowlist HTTP response header limits which requests a page may initiate using fetch and other APIs. |
| Anchor position container queries | 143 | — | limited | Anchor position container queries with the @container anchored(fallback: …) at-rule apply styles to an element based on the element's anchor position. |
| Container scroll-state queries | 133 | — | limited | Container scroll-state queries with the @container scroll-state(...) at-rule apply styles to an element based on the sticky positioning, snapped, and scrollable state of the container. |
| context-fill and context-stroke | 124 | — | limited | The context-fill and context-stroke CSS values are used with fill and stroke in SVG <marker> or <use> elements to match a color from where they appear. |
| controlslist | 58 | — | limited | The controlslist attribute for <audio> or <video> hides parts of the browser's built-in controls. For example, controlslist="nofullscreen" removes the button to play the video in fullscreen. |
| Cookie store | 87 | — | limited | The CookieStore API is an asynchronous and promise-based API for managing cookies. It does not rely on document and so is available to service workers as well. |
| cookieStore.get() metadata | 87 | — | limited | The cookieStore.get() method returns cookie metadata, such as the domain, expires, path, sameSite and secure properties. |
| corner-shape | 139 | — | limited | The corner-shape CSS property sets the shape of an element's corners when using border-radius, allowing for shapes other than rounded corners. For example, corner-shape: squircle is a shape in between a square and rounded corner. |
| CSS import attributes | 123 | — | limited | Module import … with { type: "css" } statements load CSS modules as constructable stylesheets. Also known as CSS module scripts. |
| CSSPseudoElement | 149 | — | limited | A CSSPseudoElement object represents a pseudo-element and its context in the document tree. You get an instance through the pseudo() method of Element or CSSPseudoElement objects or the pseudoTarget property of some events. |
| Customized built-in elements | 67 | — | limited | Customized built-in elements are HTML elements that extend built-in elements using the is attribute, to add new behaviors that you define. |
| Device memory | 97 | — | limited | The navigator.deviceMemory property is the approximate amount of device memory, in gigabytes. |
| Device posture | 132 | — | limited | The device posture API and the device-posture CSS media feature reflect the physical posture of a device, such as whether a foldable device is folded or unfolded. |
| devicePixelRatio | 1 | — | limited | The window.devicePixelRatio property is the ratio of the size of one CSS pixel to the vertical size of one physical pixel on the current display device. |
| <dialog closedby> | 134 | — | limited | The closedby HTML attribute for <dialog> sets which user actions close a dialog. For example, closedby="any" allows the dialog to be closed by clicking outside of it. |
| display-mode media query | 47 | — | limited | The display-mode CSS media query sets styles based on whether the web page is in an ordinary browser tab mode or another mode, such as fullscreen, standalone, or minimal-ui. |
| Document picture-in-picture | 130 | — | limited | The document picture-in-picture API creates an always-on-top window from arbitrary HTML content. |
| dynamic-range-limit | 136 | — | limited | The dynamic-range-limit CSS property controls the peak luminance of high dynamic range content. You can use this to coordinate the apparent brightness of HDR and SDR content. |
| EditContext | 121 | — | limited | The EditContext API allows you to build rich text editors that support advanced text input, such as Input Method Editor (IME) composition, an emoji picker, or other platform-specific editing UI. |
| Element capture | 132 | — | limited | The restrictTo() method on screen capture media tracks limits capture to a specific element, excluding content which might occlude the element itself, such as video conferencing controls. |
| Element timing performance entries | 77 | — | limited | An element performance entry measures the time to render elements that have the elementtiming attribute. |
| Explicit resource management | 134 | — | limited | The using and await using declarations and the dispose and asyncDispose symbols manage the lifecycle of resources such as file handles and streams. The DisposableStack and AsyncDisposableStack objects can group, dispose, and coordinate dependencies between multiple disposable resources. |
| window.external | 9 | — | limited | The window.external.AddSearchProvider() and window.external.IsSearchProviderInstalled() do nothing. Historically, they added external search providers to the browser. |
| Eyedropper | 96 | — | limited | The EyeDropper API opens an eyedropper tool, a color picker that allows users to select a color from their screen. |
| Feature policy | 74 | — | limited | The Feature-Policy response header sets whether a policy-controlled feature, such as an API, may be used in a document. Not to be confused with permissions policy. |
| Federated credential management | 116 | — | limited | The IdentityCredential API delegates authentication to a third-party identity provider, instead of using third-party cookies. Also known as FedCM. |
| Federated credentials | 51 | — | limited | The FederatedCredential API represents the details required to authenticate a user using a third-party identity provider. Not to be confused with federated credential management (FedCM). |
| Fetch metadata request headers | 80 | — | limited | The Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site, and Sec-Fetch-User HTTP headers provide extra information about the way a request was made, to help servers reject certain kinds of malicious requests. |
| Fetch upload streams | 105 | — | limited | The fetch() method and Request() constructor accept a ReadableStream object as the request's body option, to stream upload data to the server. |
| fetchLater | 135 | — | limited | The fetchLater() method requests a deferred fetch sent at an unknown time. The browser chooses a reliable time to send the request, ideally when the document is unloaded, and ignores the response. This API is useful for sending beacons to a server without expecting a particular response. |
| File system access | 86 | — | limited | The showOpenFilePicker(), showDirectoryPicker(), and showSaveFilePicker() methods request access to files and directories on the user's device and returns a handle for reading and writing to them. |
| flex-wrap: balance | 150 | — | limited | The flex-wrap: balance CSS declaration distributes items in a multi-line flex container such that each line has about the same number of items. |
| font-language-override | 143 | — | limited | The font-language-override CSS property sets which language-specific glyphs are displayed. |
| Font metric overrides | 87 | — | limited | The ascent-override, descent-override, and line-gap-override descriptors adjust the display of a font declared in an @font-face statement. This can help make fallback fonts look the same size. |
| font-palette animation | 121 | — | limited | You can animate color fonts between two font-palette values. |
| font-variant-emoji | 131 | — | limited | The font-variant-emoji CSS property sets the default presentation for emoji characters. |
| Responsive iframes | 154 | — | limited | The frame-sizing CSS property sets the size of an <iframe> element to that of it contents, to avoid scrolling in the iframe. Embedded documents allow this with the <meta name="responsive-embedded-sizing"> element and request resizing in the embedding page by calling window.requestResize(). |
| @function | 139 | — | limited | The @function CSS at-rule defines a custom function that takes CSS values or custom properties as arguments, and returns a CSS value. It can be based on conditional logic such as by using the @media at-rule. |
| Gamepad touch buttons | 73 | — | limited | The touched property of a GamepadButton object indicates whether a button capable of detecting touch is currently touched. |
| Gap decorations | 149 | — | limited | The column-rule and row-rule CSS properties display decorative lines between columns and rows of a flex, grid, or multi-column layout. The rule-break, rule-outset, and rule-paint-order properties control the appearance of these lines. |
| <geolocation> | 144 | — | limited | The <geolocation> HTML element represents a button that, upon activation, prompts the user to choose whether to grant the page access to geolocation data. |
| HTMLGeolocationElement initialPermissionStatus | 144 | — | limited | The initialPermissionStatus property of the HTMLGeolocationElement API represents whether geolocation was previously granted, denied, or neither, when the page first loads. |
| IndexedDB getAllRecords() | 141 | — | limited | The getAllRecords() method of IDBObjectStore and IDBIndex return records and their primary keys from an IndexedDB store or index. The records can be read in batches and in reverse order. The getAllRecords() methods speed up read operations on large datasets. |
| Gyroscope | 67 | — | limited | The Gyroscope API reads the angular velocity of a device in three dimensions. |
| hidden="until-found" | 102 | — | limited | The hidden="until-found" attribute hides an element until it is found using the browser's find-in-page search or it is directly navigated to by following a URL fragment. |
| Custom highlights from point | 140 | — | limited | The CSS.highlights.highlightsFromPoint() method returns an array of Highlight objects at a specified point. |
| :host-context() | 54 | — | limited | The :host-context() CSS pseudo-class selects the containing element of the shadow tree in which it is used if that element or an ancestor matches the provided selector. |
| HTML processing instructions | 150 | — | limited | An HTML processing instruction is text enclosed by <? and >, which marks a target for further processing. They may appear anywhere in a document. They are ignored like comments when they're not recognized for a specific purpose. |
| Hyphenate limit chars | 109 | — | limited | The hyphenate-limit-chars CSS property sets the number of characters in a word before it is hyphenated and the minimum number of characters on either side of the hyphen. |
| Idle detection | 94 | — | limited | The IdleDetector API is used to notify a webpage of the user's idle, active, and locked state. |
| if() | 137 | — | limited | The if() CSS function is an inline conditional value that returns a value based on a set of conditions. |
| Credentialless iframes | 110 | — | limited | The credentialless attribute for the <iframe> HTML element loads third-party content in an ephemeral context and does not send any credentials such as cookies. When using cross-origin isolation, this allows you to embed content that does not send Cross-Origin-Embedder-Policy headers. |
| initial-letter | 110 | — | limited | The initial-letter CSS property sets the number of lines the first letter of an element occupies. You can use the property to make a raised capital or drop cap. |
| Ink | 94 | — | limited | The navigator.ink API uses the system compositor to draw to a <canvas> element ahead of pointer events, reducing the delay between moving a stylus or cursor and a pen stroke appearing on screen. |
| <input type="month"> | 20 | — | limited | The <input type="month"> HTML element shows a month picker. |
| <input type="week"> | 20 | — | limited | The <input type="week"> HTML element shows a week picker. |
| Interaction contentful paint performance entries | 151 | — | limited | An interaction-contentful-paint performance entry measures the duration of an interaction that causes one or more contentful paints. You can use it to measure LCP for soft navigations in single page apps. |
| interactivity | 135 | — | limited | The interactivity: inert CSS declaration makes an element and its descendants inert, like when using the inert HTML attribute. Inert elements can't be focused or clicked, their text can't be selected or found using the browser's find-in-page feature. |
| Interest invokers | 142 | — | limited | Interest invokers, registered by the interestfor HTML attribute, trigger events and actions on a target element when a user shows interest in the element, through behaviors such as hover, focus, or long-press. Pseudo-elements apply styles to sources and targets of interest. |
| interpolate-size | 129 | — | limited | The interpolate-size CSS property sets whether animations and transitions interpolate between a numeric value and a keyword value, such as from a fixed length to auto or fit-content. |
| Intersection observer visibility tracking | 74 | — | limited | The trackVisibility parameter for the IntersectionObserver constructor enables tracking the visibility of an element, to detect if it may be obscured by other content or visual effects. Also known as IntersectionObserver v2. |
| Error.isError() | 134 | — | limited | The Error.isError() static method checks whether a value is an Error object. |
| isInputPending() | 87 | — | limited | The navigator.scheduling.isInputPending() method checks if there are pending input events, such as touch or mouse events. This allows you to yield from long-running scripts that might be blocking user interaction. |
| Iterator includes() | 154 | — | limited | The includes() method of an Iterator object returns true when an item yielded by the iterator is the same as a given value. It's similar to the includes() method of arrays. |
| Iterator join() | 153 | — | limited | The join() method of an Iterator object returns a string concatenation of all the iterator's items, separated by commas or a given separator string. It's similar to the join() method of arrays. |
| Iterator.zip() and Iterator.zipKeyed() | 153 | — | limited | The Iterator.zip() and Iterator.zipKeyed() static methods return new iterators that aggregate items from multiple iterables. You can use them to iterate jointly, to get all of the items at the same position in each iterable. |
| justify-self in block layouts | 130 | — | limited | The justify-self CSS property aligns an item along a container's inline axis in block layouts, like it does in grid layouts. Likewise, the justify-items property sets a default justify-self value for all items in a container in a block layout. |
| Keyboard lock | 68 | — | limited | The navigator.keyboard.lock() API allows you to capture keys that are normally reserved by the operating system. It can be used to provide an immersive fullscreen experience such as games. |
| Keyboard map | 69 | — | limited | The navigator.keyboard.getLayoutMap() API returns a map from key codes to human readable key names. It can be used to describe buttons to the user when using the keyboard as a set of buttons, such as in games. |
| Language detector | 138 | — | limited | The LanguageDetector API identifies the likely natural language that some text is written in. You can use this API to supplement machine translation when the source source language is not known. |
| LanguageModel | 148 | — | limited | The LanguageModel API prompts an on-device language model. Also known as the Prompt API. |
| Layout instability performance entries | 84 | — | limited | A layout-shift performance entry measures the layout stability of web pages based on movements of the elements on the page. They're used to calculate cumulative layout shift (CLS), a common metric for perceived stability. |
| <link rel="prefetch"> | 8 | — | limited | The rel="prefetch" attribute for the <link> HTML element is a hint to the browser that the user is likely to navigate to a resource, so the browser should preemptively fetch and cache the resource. |
| Lazy-loading media | 150 | — | limited | The loading="lazy" attribute for <video> and <audio> elements defers loading the media resource until the element is near the viewport. This matches the lazy-loading behavior for <img> and <iframe> elements. |
| Local fonts | 103 | — | limited | The window.queryLocalFonts() method returns an array of locally-installed fonts, each represented by a FontData object. |
| Local network access | 142 | — | limited | The "local-network-access" user permission (and certain actions that imply this permission, such as a fetch() request with { targetAddressSpace: "local" }) allows a site to send requests to servers on a user's local network. |
| Long animation frames performance entries | 123 | — | limited | A long-animation-frame performance entry measures rendering updates that take longer than 50 milliseconds. Also known as LoAFs. |
| Long task performance entries | 58 | — | limited | A longtask performance entry measures tasks that occupy the UI thread for 50 milliseconds or more, a metric for input latency, delayed animations, and other sources of "jank." |
| ::marker | 86 | — | limited | The ::marker CSS pseudo-element selects list item markers for styling numbers or bullets. |
| Memory measurement | 89 | — | limited | The measureUserAgentSpecificMemory() method estimates the memory usage of a web application including all its iframes and workers. |
| <meta name="application-title"> | 134 | — | limited | The name="application-title" attribute for the <meta> HTML element sets an installed web application's title bar text. |
| <meta name="text-scale"> | 146 | — | limited | The <meta name="text-scale" content="scale" /> HTML element allows the browser's initial font size to be affected by the operating system text scale settings. The <meta name="text-scale" content="legacy" /> element is the default behavior that respects only browser font-size settings. |
| moveBefore() | 133 | — | limited | The moveBefore() DOM method relocates a node while preserving its state. For example, you can move the active element without losing focus, move an animated element without resetting the animation, or move an iframe without reloading its content. |
| Navigation precommit handlers | 146 | — | limited | The precommitHandler callback option to NavigateEvent's intercept() method returns a promise that defers navigation until the promise resolves. You can use this to change the navigation's URL, state, and history before navigation occurs. |
| Navigation timing confidence | 145 | — | limited | The confidence property of a navigation performance entry describes whether the navigation metric is likely to be representative the page's performance (high confidence) or affected by transient conditions, such as browser startup (low confidence). |
| Non-cookie storage access | 125 | — | limited | Non-cookie storage access extends the requestStorageAccess() API to let content in cross-site iframes request access to first-party data beyond cookies. |
| object-view-box | 104 | — | limited | The object-view-box CSS property crops and zooms to an inset area of an image. |
| Observable | 135 | — | limited | The when() method on a event target returns an Observable object, which provides a declarative API for subscribing to and operating on events. It's an alternative to addEventListener() callbacks. |
| Orientation Sensor | 67 | — | limited | The AbsoluteOrientationSensor and RelativeOrientationSensor APIs describe the physical orientation of a device in three-dimensional space, either in relation to the Earth's coordinate system or in relation to the device's own orientation, respectively. |
| overlay | 117 | — | limited | The overlay CSS property, used as an allow-discrete CSS transition, prevents a top layer element, such as a popover or a <dialog>, from being removed from the top layer before it has finished animating. You can't set the value of the overlay property; only use it as transition property. |
| overscroll-behavior | 144 | — | limited | The overscroll-behavior CSS property disables default scrolling behaviors when the edges of a scrolling area are reached. |
| Page break aliases | 1 | — | limited | The page-break-before, page-break-inside, and page-break-after CSS properties are aliases to the break-before, break-inside, and break-after properties. |
| Page lifecycle | 68 | — | limited | The page lifecycle API helps you safely handle page suspensions or discards from memory. The freeze and resume events fire when the browser suspends or resumes a page from memory while the document.wasDiscarded property reports whether the page was reloaded after being dropped. |
| page-orientation | 85 | — | limited | The page-orientation CSS property sets the rotation of a page after pagination. This allows pages with the same size declaration to display with different orientations. |
| Page visibility state performance entries | 115 | — | limited | A visibility-state performance entry measures the timing of page visibility state changes, such as when a tab is no longer visible or the user has switched to another app. |
| paint() | 65 | — | limited | The paint() CSS function creates a custom image, drawn using a paint worklet, for an element's background or border. |
| Partitioned cookies | 114 | — | limited | Partitioned cookies allow you to opt a cookie into partitioned storage, with a separate cookie jar per top-level site. Also known as Cookies Having Independent Partitioned State or CHIPS. |
| Password credentials | 60 | — | limited | The PasswordCredential API represents a username and password. |
| path() | 88 | — | limited | The path() CSS shape function creates a shape for clip-path, shape-outside, and the SVG attribute d. |
| Payment handler | 70 | — | limited | The payment handler API registers a web application as a payment handler and responds to payment requests in the browser's user interface, rather than redirecting users to a separate site to complete a payment. |
| Periodic background sync | 80 | — | limited | The periodic background synchronization API fires a recurring periodicsync event in a service worker. You can use this to update data in the background at regular intervals. |
| Permissions policy | 108 | — | limited | The Permissions-Policy response header and the allow attribute for <iframe> elements sets whether a policy-controlled feature, such as an API, may be used in a document. |
| popover="hint" | 151 | — | limited | The popover="hint" global HTML attribute creates a popover that is subordinate to popovers with a popover="auto" attribute. You can use this to create tooltips that don't dismiss auto popovers. |
| prefers-reduced-transparency media query | 119 | — | limited | The prefers-reduced-transparency CSS media query sets styles based on whether the user prefers to reduce the amount of transparent effects on their device, for example to improve contrast and legibility. |
| Presentation API | 47 | — | limited | The Presentation API shows or controls content on another display, such as a network-connected TV or projector. |
| Profiler | 94 | — | limited | The Profiler API records data about the execution of a page, which you can send to a server for later analysis. Also known as self-profiling. |
| Protected audience | 134 | — | limited | The protected audience API facilitates advertisement sales by allowing sites to register users as part of an interest group or to choose which ads appear based on those interest groups, while minimizing the ability of advertisers to track specific members of the interest group. Also known as FLEDGE. |
| reading-flow | 137 | — | limited | The reading-flow CSS property sets the order in which flex or grid elements are rendered to speech or reached via focus navigation. The reading-order property overrides this order. |
| Reference target | 152 | — | limited | The referenceTarget property of a ShadowRoot object forwards attributes such as for and aria-labelledby to elements inside a shadow DOM. You can use this to, for example, link a <label> to its <input> even if the <input> is in the shadow DOM of a web component. |
| Region capture | 104 | — | limited | When using navigator.mediaDevices.getDisplayMedia() to capture a browser tab as a video stream, the region capture API allows you to crop the video to the bounding box of a given element. In contrast to the element capture API, any content that overlays that element is also captured. |
| registerProtocolHandler | 13 | — | limited | The navigator.registerProtocolHandler() method declares a site's ability to handle an address scheme (also known as a protocol). For example, an email site can register to open mailto: URLs or a VoIP site to open tel: URLs. |
| Related website sets | 119 | — | limited | Related website sets declares relationships between sites so the browser allows cookie and storage access between them through methods such as document.requestStorageAccessFor(). |
| Crash reporting | 96 | — | limited | Crash reporting sends a report to a URL nominated by the Reporting-Endpoints header when a user is unable to continue using the page because the browser or tab crashed. |
| Crash report storage | 145 | — | limited | The window.crashReport object is a key-value store to record information about your application's state. If there's a crash, then the data in the key-value store is sent to your crash reporting endpoint, to help you pinpoint the cause of the crash. |
| Deprecation reports | 69 | — | limited | Deprecation reporting sends a report to a URL nominated by the Reporting-Endpoints header or the ReportingObserver API when a page uses a deprecated API or other browser feature. |
| Intervention reports | 69 | — | limited | Intervention reporting sends a report to a URL nominated by the Reporting-Endpoints header when the browser has not honored an application's request, contrary to specified behavior, such as for security or privacy reasons. |
| Permissions policy violation reporting | 120 | — | limited | Permissions policy violation reporting sends a report to a URL nominated by the Reporting-Endpoints header or the ReportingObserver API when a page violates a policy. You can also use the Permissions-Policy-Report-Only header to receive reports of what might break under a given policy. |
| requestIdleCallback() | 47 | — | limited | The requestIdleCallback() API queues a function that runs in idle browser time, either at the end of a frame or when the user is inactive. Also known as the background tasks API. |
| Sanitizer API | 146 | — | limited | The Sanitizer API customizes the sanitization of HTML parsed and inserted into the DOM in a way that can prevent cross-site scripting attacks. You can use it with DOM APIs that accept a sanitizer option, such as parseHTML() or setHTML(). |
| Save-Data | 65 | — | limited | Browsers send the Save-Data HTTP request header when the user turns on a data-saving mode. It is a hint to reduce data sent to the browser. Servers should respond with alternative content, such as smaller images and videos, or different markup and styling. |
| Scheduler API | 129 | — | limited | The scheduler API provides a way to prioritize all tasks belonging to an application. |
| scroll-axis-lock | 153 | — | limited | The scroll-axis-lock property controls whether scrolling is locked to one dimension at a time or freely follows movement in two dimensions. By default, browsers may lock the scroll axis, ignoring minor perpendicular scrolling, when scrolling is nearly vertical or horizontal. |
| ::scroll-button | 135 | — | limited | The ::scroll-button(<dir>) CSS pseudo-element is a focusable button which scrolls its originating scroll container element in the specified direction. |
| scroll-initial-target | 133 | — | limited | The scroll-initial-target: nearest CSS declaration sets the initial scroll position of its scroll container to the top of the element, much like scrolling to a URL fragment. |
| scrollIntoView() container | 140 | — | limited | The container option of the scrollIntoView() method sets which ancestor scroll container to scroll. The "nearest" value scrolls only the nearest ancestor, instead of the default "all". |
| Scroll marker target pseudo-classes | 142 | — | limited | The :target-current CSS pseudo-class selects the active scroll marker (as in ::scroll-marker), while the :target-after and :target-before pseudo-classes select the inactive markers preceding and following the active scroll marker. |
| Scroll markers | 135 | — | limited | A scroll marker scrolls a container to a scroll target. The ::scroll-marker CSS pseudo-element selects a scroll marker in a ::scroll-marker-group pseudo-element, generated before or after the scroll container. You can use them to navigate and style tables of contents, tab panels, and carousels. |
| Scroll method promises | 150 | — | limited | The scroll(), scrollBy(), scrollTo(), and scrollIntoView() methods on the Element and Window interfaces return Promises that resolve when scrolling completes. |
| Scroll snap events | 129 | — | limited | The scrollsnapchanging and scrollsnapchange events fire when a scroll gesture changes the selected scroll snap target. |
| scroll-target-group | 140 | — | limited | The scroll-target-group CSS property sets the container where anchor links act as scroll markers. Using selectors such as :target-current, you can style elements when a target has scrolled into view. It's an alternative to the ::scroll-marker-group pseudo-element, which generates scroll markers. |
| Secure payment confirmation | 139 | — | limited | The payment extension of a web authentication credential allows a relying party (such as a bank) to create a credential that can be queried by any merchant origin as part of an online checkout that uses the Payment Request API's secure-payment-confirmation payment method. Also known as SPC. |
| Web serial | 89 | — | limited | The navigator.serial API communicates with devices over serial ports, such as microcontrollers. |
| Serializable errors | 77 | — | limited | The DOMException, Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, and URIError objects are serializable. You can call structuredClone() on an error object or pass it to a worker using postMessage(). |
| Shared storage locks | 134 | — | limited | The withLock option to set(), append(), delete(), clear(), and batchUpdate() methods of the sharedStorage API prevents duplicate reporting from cross-site race conditions. |
| Shared worker extended lifetime | 148 | — | limited | The extendedLifetime option of the SharedWorker() constructor gives shared workers extra time to perform operations after all pages using it have been navigated away from or closed. |
| showPicker() for <select> | 121 | — | limited | The showPicker() method for <select> elements shows the dropdown menu or other user interface for picking one of the options. |
| Signature-based resource integrity | 141 | — | limited | Signature-based resource integrity verifies a script's provenance by checking that the resource has been signed with a trusted key given by the <script> element's integrity attribute. |
| <img sizes="auto" loading="lazy"> | 126 | — | limited | The sizes="auto" attribute for the <img> HTML element sets the layout size for the image based on the computed layout size when choosing a source from the srcset. This attribute only applies to images with the loading="lazy" attribute. |
| Soft navigation performance entries | 151 | — | limited | A soft-navigation performance entry measures the duration of a soft navigation in a single page app. A soft navigation is defined as when a trusted user interaction causes a URL update and a visible contentful paint to the screen. |
| Speculation rules | 109 | — | limited | Speculation rules are hints to the browser to proactively download pages in the background so they appear instantly when the user navigates to them. |
| Speech recognition | 139 | — | limited | The SpeechRecognition API converts audio into text using the device's speech recognition service. |
| Storage buckets | 122 | — | limited | The navigator.storageBuckets API allows you to organize locally stored data into groups called storage buckets. Each bucket can have different settings, allowing the browser to manage and delete buckets independently rather than applying the same treatment to all. |
| Range syntax for style queries | 142 | — | limited | The @container style() CSS at-rule and if(style()) CSS function queries accept a range syntax, such as >, <, >=, <=, to query for inexact values. |
| Summarizer | 138 | — | limited | The Summarizer API uses an on-device language model to summarize text. |
| at-rule() | 148 | — | limited | The at-rule() function, when used with @supports, checks if a CSS at-rule is supported. For example @supports at-rule(@starting-style) checks if the @starting-style at-rule is supported. |
| named-feature() | 150 | — | limited | The named-feature() function, when used with @supports, checks if a named CSS behavior is supported. The CSS behavior names are defined by specification. For example, @supports named-feature(anchor-position-follows-transforms) checks whether anchor-positioning applies after transforms." |
| symbols() | 155 | — | limited | The symbols() CSS function defines counter styles as a value of properties such as list-style. It's an inline alternative to the @counter-style CSS at-rule. |
| <template for> | 150 | — | limited | The <template for="…"> HTML element replaces the content at a named range or insertion point, marked by the processing instructions <?start name="…"> and <?end> or <?marker name="…">. You can use this to stream or "patch" partial updates into the document out of order. |
| Temporal | 144 | — | limited | The Temporal API allows you to work with dates, times, time zones, and durations. It is more powerful than the Date API. |
| text-decoration in ::selection | 105 | — | limited | The text-decoration CSS property in a ::selection rule sets the underline and other text decoration styles on the text a user has highlighted. |
| text-decoration-skip-spaces | 155 | — | limited | The text-decoration-skip-spaces CSS property sets whether text decoration lines (such as underlines and overlines) skip over whitespace characters. You can use this to prevent decorations from being drawn under spaces, which is sometimes more visually appealing. |
| text-fit | 150 | — | limited | The text-fit CSS property scales text to fill the inline size of its container. You can use this to grow or shrink headlines, captions, or pull quotes to fit a container. |
| text-justify | 145 | — | limited | The text-justify CSS property sets the justification method of text when text-align: justify is set. |
| Text import attributes | 155 | — | limited | Module import … with { type: "text" } statements load text data as a string value. |
| text-size-adjust | 54 | — | limited | The text-size-adjust CSS property disables or modifies the browser's default text size adjustment for small screen sizes. |
| text-spacing-trim | 123 | — | limited | The text-spacing-trim CSS property controls spacing around CJK characters, avoiding excessive whitespace when using full-width punctuation characters. |
| Touch events | 22 | — | limited | Touch events touchstart, touchmove, touchend, and touchcancel fire when users interact with a touch-sensitive surface, such as a screen or drawing tablet. These events are similar to mouse events. |
| Transferable streams | 87 | — | limited | Streams are transferable objects, which can be moved between contexts such as windows and workers. |
| Translator | 138 | — | limited | The Translator API translates some text from one natural language to another, using machine translation. |
| User agent client hints | 90 | — | limited | The Sec-CH-UA HTTP request header and the navigator.userAgentData API expose browser and platform information used to vary responses and application logic. User agent client hints are similar to user agent strings but more privacy-preserving and safer to parse. |
| integrity() for url() | 150 | — | limited | The url() CSS function accepts an integrity() modifier to use subresource integrity to verify the response from the requested URL. |
| user-select | 54 | — | limited | The user-select CSS property controls which elements can be selected by the user. |
| Vibration | 32 | — | limited | The navigator.vibrate() method makes a tactile alert, if the device is equipped with a haptic motor. |
| Element-scoped view transitions | 147 | — | limited | The startViewTransition() method of an Element object starts a view transition that affects only that element's DOM tree. You can use this to run separate elements' transitions concurrently. |
| Viewport segments | 138 | — | limited | The viewport segment CSS environment variables and media features, and the viewport.segments API, allow you to adapt your layout to devices where the display is split, such as on foldable devices. |
| Virtual keyboard | 94 | — | limited | The navigator.virtualKeyboard API inspects and controls on-screen virtual keyboards. You can use it to programmatically hide or show a virtual keyboard or respond to the keyboard disappearing or appearing. |
| Virtual pressure sources | 129 | — | limited | The CreateVirtualPressureSource WebDriver command creates artificial sources of compute pressure for testing without the need real device sources of compute pressure. |
| Virtual sensors | 120 | — | limited | The CreateVirtualSensor WebDriver command creates a virtual sensor for testing applications that use sensor APIs, without the need for real device sensors. |
| Memory64 (WebAssembly) | 133 | — | limited | Instructions accept 64-bit memory indexes. |
| Multi-memory (WebAssembly) | 120 | — | limited | A single module in WebAssembly can have multiple memories. |
| Relaxed-width SIMD (WebAssembly) | 114 | — | limited | Relaxed SIMD (Single Instruction Multiple Data) introduces local non-determinism, where the results of the instructions may vary based on hardware support. |
| String builtins (WebAssembly) | 130 | — | limited | The WebAssembly builtin string functions mirror a subset of the JavaScript String API and adapt it to be efficiently callable without JavaScript glue code. |
| Web Bluetooth | 70 | — | limited | The Web Bluetooth API enables selecting and communicating with nearby Bluetooth devices. |
| Web MIDI | 43 | — | limited | The Web MIDI API enables selecting MIDI input and output devices and sending and receiving MIDI messages. |
| WebDriver BiDi | 126 | — | limited | WebDriver BiDi is a bidirectional protocol that allows a WebDriver client and a browser to communicate with each other. |
| Desynchronized WebGL canvas | 81 | — | limited | The optional desynchronized parameter of a canvas's getContext() method permits the browser to draw a WebGL canvas independently of the event loop. This can reduce drawing latency. |
| SharedArrayBuffer in WebGL | 60 | — | limited | SharedArrayBuffer objects can be used in WebGL APIs that previously only worked with ArrayBuffer objects. |
| Desynchronized WebGL2 canvas | 81 | — | limited | The optional desynchronized parameter of a canvas's getContext() method permits the browser to draw a WebGL2 canvas independently of the event loop. This can reduce drawing latency. |
| WebGPU subgroups | 144 | — | limited | The subgroups extension for the WebGPU Shading Language (WGSL) enables SIMD parallelism. Using subgroups, threads in a workgroup can efficiently communicate and perform collective operations. |
| WebHID | 89 | — | limited | The WebHID API provides access to Human Interface Devices (HID) that are connected to the user's device. |
| WebUSB | 61 | — | limited | The WebUSB API exposes USB compatible devices to web pages. |
| Anchors (WebXR) | 85 | — | limited | An XRAnchor object keeps track of a pose that is fixed relative to the real world. Anchors build an illusion that the placed objects are really present in the user's environment. |
| Augmented reality | 86 | — | limited | The "immersive-ar" value for navigator.xr.requestSession() starts an augmented reality WebXR session that renders content aligned with the visible environment. |
| Raw camera access for WebXR | 107 | — | limited | The XRView.camera property provides direct access to pose-synchronized camera images within a WebXR session. |
| Depth sensing | 90 | — | limited | An XRDepthInformation object represents a measurement of the distance from the user's device to the real-world geometry in the user's environment. |
| WebXR | 79 | — | limited | The navigator.xr API represents the browser's virtual reality or augmented reality system. You can use to request a WebXR session. |
| DOM overlays for WebXR | 83 | — | limited | A DOM overlay shows 2D DOM content as an interactive, transparent layer on top of a WebXR application's WebGL content and camera image. |
| Gamepad (WebXR) | 79 | — | limited | The gamepad attribute of an XRInputSource represents an XR input device, such as a motion controller, that reports data from physical inputs (such as buttons, touch pads, and triggers). |
| Hand input | 131 | — | limited | An XRHand object, from the hand attribute of an XRInputSource object, represents a WebXR session's fully-articulated hand tracking model. |
| Hit test | 81 | — | limited | The getHitTestResults() method of an XRFrame object helps place objects in an augmented reality session by finding where cast rays intersect with real-world geometry. |
| Layers (WebXR) | 147 | — | limited | WebXR layer types, such as XRCylinderLayer, XRCylinderLayer, XREquirectLayer, XRProjectionLayer or XRQuadLayer, are managed by the system compositor, to reduce latency or resampling. |
| Lighting estimation | 90 | — | limited | The XRLightProbe and XRLightEstimate objects represent real-world environmental lighting conditions during a WebXR session. |
| Wheel events momentum | 151 | — | limited | The momentum property of a wheel event object is true when the event represents simulated scroll inertia, also known as a "fling" event. |
| Window Controls Overlay | 105 | — | limited | The display_override: ["window-controls-overlay"] web application manifest member shows content in the title bar area of a progressive web app that is installed on a desktop device. |
| window-drag | 152 | — | limited | The window-drag: move CSS declaration sets an element as a window drag handle, like a device's app title bar. You can use this to add click-and-drag areas to an installed progressive web app, often alongside window controls overlay. |
| Window management | 111 | — | limited | The window.getScreenDetails() method gets information about the screens on a device, which you can use to place new windows on a specific screen with window.open(). |
| word-break: auto-phrase | 119 | — | limited | The word-break: auto-phrase CSS declaration specifies that wrapping should occur at natural phrase boundaries, especially in CJK languages. |

## Safari only (39)

| Feature | Chrome | Safari | Baseline | Summary |
| --- | --- | --- | --- | --- |
| Anchor positioning | — | 27 | limited | Anchor positioning places an element based on the position of another element. For example, you can place a tooltip next to the content it references. |
| anchors-valid and anchors-visible | — | 26.2 | limited | The position-visibility: anchors-valid and position-visibility: anchors-visible CSS declarations are aliases for anchor-valid and anchor-visible. |
| Audio session | — | 16.4 | limited | The navigator.audioSession API controls how audio playback interacts with other applications. For example, playing music can pause audio from other applications, while ambient audio can play at the same time. |
| Audio and video tracks | — | 8 | limited | The audioTracks and videoTracks APIs for media elements switch audio and video tracks during playback. |
| Case-sensitive attribute selector | — | 27 | limited | The s identifier in a CSS attribute selector matches attribute values case-sensitively in document languages like HTML where attribute values are case-insensitive. |
| Clearing site data | — | 17 | limited | The Clear-Site-Data header deletes browsing data (such as cookies, storage, or cache) associated with the requesting website. |
| color-adjust | — | 15.4 | limited | The color-adjust shorthand CSS property allows multiple performance related color adjustments to be set at once. Setting the print-color-adjust CSS property directly is preferred, as it is the only such adjustment so far defined. |
| color-mix() with three or more colors | — | 27 | limited | The color-mix() CSS function accepts three or more colors. |
| cross-fade() | — | 10 | limited | The cross-fade() CSS function generates an image by mixing two images. |
| CSS object model (DOM level 2) | — | 10 | limited | The DOM level 2 style specification defined interfaces to access and modify CSS styles, such as CSSValue and CSSPrimitiveValue, that were later excluded from the CSS object model. |
| fastSeek() | — | 8 | limited | The fastSeek() method seeks an <audio> or <video> element as fast as possible, by seeking to a keyframe instead of exactly the requested time. |
| Fetch form data | — | 14.1 | limited | The Request.formData() and Response.formData() methods read a request or response body and return a FormData promise. You can use it to access the fields of a form submission. |
| filter() | — | 9.1 | limited | The filter() CSS function applies one or more graphic effects to a CSS image, such as a background image. You can use functions, such as blur() and drop-shadow(), alone or combined to produce different effects. For instance, background: filter(url(image.png), blur(2px)). |
| UI fonts | — | 13.1 | limited | The ui-serif, ui-sans-serif, ui-monospace and ui-rounded values for the font-family CSS property use device-default user interface fonts for text. |
| font-width | — | 18.4 | limited | The font-width CSS property selects a font face from a font family based on width, either by a keyword such as condensed or a percentage. |
| glyph-orientation-vertical | — | 4 | limited | The glyph-orientation-vertical CSS property sets the orientation of glyphs in text rendered in a vertical writing mode. |
| Grid lanes | — | 26.4 | limited | The display: grid-lanes and display: inline-grid-lanes CSS declarations create a layout where items are tightly packed in parallel lanes. Items are placed one by one in the lane that has the most available space. Also known as masonry. |
| Hanging punctuation | — | 26.5 | limited | The hanging-punctuation CSS property puts punctuation characters outside of the box to align the text with the rest of the document. |
| alpha and colorspace attributes for <input type=color> | — | 18.4 | limited | The ability to control the opacity of a color picked using <input type="color"> and determine the colorspace of the selected color. |
| Insertable streams for MediaStreamTrack | — | 18 | limited | The MediaStreamTrackProcessor and MediaStreamTrackGenerator APIs modify the contents of a media track for merging streams, applying real-time effects like funny hats, and content overlays. |
| inverted-colors media query | — | 9.1 | limited | The inverted-colors CSS media query sets styles based on whether the user has inverted all colors, such as with mobile accessibility settings. |
| Managed media source | — | 17 | limited | The ManagedMediaSource API is a MediaSource where the browser manages the memory of source buffers and may evict data if needed. |
| margin-trim | — | 16.4 | limited | The margin-trim CSS property removes the margins of child elements when they meet the edges of the container. |
| mask-border | — | 17.2 | limited | The mask-border CSS property sets how the edges of an element are masked. It is a shorthand for mask-border-outset, mask-border-repeat, mask-border-slice, mask-border-source, and mask-border-width. |
| Media element pseudo-classes | — | 15.4 | limited | The :playing, :paused, :seeking, :buffering, :stalled, :muted, and :volume-locked CSS pseudo-classes match <audio> and <video> elements based on their state. |
| MediaController | — | 7 | limited | The playback of multiple <video> or <audio> elements can be coordinated by a MediaController instance, for example to synchronize a sign-language interpreter track with the main video track. |
| <meta name="theme-color"> | — | 15 | limited | The name="theme-color" attribute for the <meta> HTML element suggests a color that the browser can use to customize the display of the page or the browser user interface. |
| Private click measurement | — | 15.4 | limited | The attributionsourceid and attributiondestination attributes for <a> elements measure clicks across websites without associating a click to a specific session. Not to be confused with attribution reporting. Also known as PCM. |
| random() | — | 26.2 | limited | The random() CSS function chooses a random numeric value within a specified range. This allows for dynamic, randomized styling using CSS. |
| ReadableStream.from() | — | 27 | limited | The ReadableStream.from() static method converts an iterable or async iterable object, such as an array or async generator function, into a readable stream. |
| ruby-overhang | — | 18.2 | limited | The ruby-overhang CSS property sets whether ruby annotations may overlap adjacent text. |
| speak-as | — | 11.1 | limited | The speak-as CSS property sets how any element's content is spoken. Not to be confused with the speak-as descriptor of @counter-style at-rules. |
| SVG 1.1 | — | ≤13.1 | limited | The SVG 1.1 image format has several components that were excluded from SVG 2, such as fonts, alternate glyphs, and the xlink namespace. |
| <input type="checkbox" switch> | — | 17.4 | limited | The switch attribute, when present on an <input type="checkbox"> HTML element, renders a switch control with an on and off state instead of a checkbox control. |
| text-autospace | — | 27 | limited | The text-autospace CSS property sets whether and how to insert spaces in inter-script text (such as when mixing Latin and Chinese characters) and around punctuation. |
| iterationComposite | — | 16.4 | limited | The iterationComposite property of a KeyframeEffect object sets whether an animation's iterations are calculated independently ("replace") or are accumulated with the value of the previous iteration ("accumulate"). |
| WEBGL_compressed_texture_pvrtc WebGL extension | — | 7 | limited | The WEBGL_compressed_texture_pvrtc extension for WebGL 1.0 and 2.0 contexts adds PVRTC compressed texture formats to compressedTexImage2D() and compressedTexSubImage2D(). |
| WebVTT cue alignment | — | 14.1 | limited | The WebVTT cue alignment settings control which part of the cue is aligned with the given line and position. Cue alignment is set using line and position settings in WebVTT files or the lineAlign and positionAlign properties of VTTCue using JavaScript. |
| WebVTT regions | — | 14.1 | limited | WebVTT regions set the areas of the video where captions or subtitles should be rendered, such as placing roll-up captions used for live captions. |

## Neither (75)

| Feature | Chrome | Safari | Baseline | Summary |
| --- | --- | --- | --- | --- |
| Ad selection | — | — | limited | The Ad Selection API facilitates advertisement sales by allowing sites to register users as part of an interest group or to choose which ads appear based on those interest groups, while minimizing the ability of advertisers to track specific members of the interest group. |
| Alternative style sheets | — | — | limited | The rel="alternate stylesheet" attribute for the <link> HTML element offers an alternative style option to users. |
| Ambient light sensor | — | — | limited | The AmbientLightSensor API returns the current light level in lux of the ambient light level around the device. |
| Barcode detector | — | — | limited | The BarcodeDetector API recognizes various barcode formats in images. |
| HTML in canvas | — | — | limited | A <canvas> HTML element with the layoutsubtree attribute can draw descendant elements in its rendering context. You can use it to style and layout text in a canvas, expose canvas content to browser features (like accessibility, translate, or find-in-page), and apply 2D and 3D effects to HTML. |
| color-contrast() | — | — | limited | The color-contrast() CSS function picks a color from a list that has the most contrast with another color. |
| Contact picker | — | — | limited | The navigator.contacts API allows you to ask users to share limited details about entries in their contact list with your application. |
| Container timing performance entries | — | — | limited | A container performance entry measures time to render child elements, for container elements that have the containertiming attribute. |
| Content Index | — | — | limited | The Content Index API allows developers to register their offline enabled content with the browser. |
| Reversed counter-reset | — | — | limited | The reversed() CSS function for counter-reset creates a counter that counts down. |
| Custom ellipses | — | — | limited | The text-overflow CSS property with a string value sets the string representing clipped text. |
| Custom media queries | — | — | limited | The @custom-media CSS at-rule names a media query, which you can reuse in multiple @media rules. |
| Form-associated WebMCP attributes | — | — | limited | The toolname, tooldescription, and toolautosubmit HTML form element attributes register actions that can be called by in-browser AI agents or browser extensions. Also known as declarative WebMCP. |
| Device-bound session credentials | — | — | limited | Device-bound session credentials is a protocol to request proof of possession of a private key. Regularly confirming key possession can help protect against cookie theft. |
| Digital goods | — | — | limited | The window.getDigitalGoodsService API connects to stores or billing services for in-app products and subscriptions. |
| display: contents | — | — | limited | The display: contents CSS declaration sets an element to display only its contents, not itself. |
| display: ruby | — | — | limited | The display: ruby CSS declaration renders an element with the box layout of a <ruby> HTML element. Child elements may use equivalents to <ruby> internal elements such as display: ruby-base for <rb>. |
| document.modelContext | — | — | limited | The document.modelContext API registers page actions that can be called by in-browser AI agents or browser extensions. Also known as WebMCP. |
| Early data | — | — | limited | TLS 1.3 sessions may be resumed more quickly by sending so-called early data to servers before the TLS handshake has finished. Also known as zero round-trip time resumption or 0-RTT. |
| element() | — | — | limited | The element() CSS function creates a live-updating image from an HTML element that can be used as an image or background image. |
| EXT_disjoint_timer_query WebGL extension | — | — | limited | The EXT_disjoint_timer_query extension for WebGL 1.0 contexts measures the duration of a set of GL commands, without stalling the rendering pipeline. |
| <fencedframe> | — | — | limited | The <fencedframe> element embeds another HTML page into the current page in a more secure and privacy-preserving way than <iframe> elements. |
| fit-content() | — | — | limited | The fit-content() CSS function, used outside of a grid layout property, clamps a length between min-content and max-content. |
| focusgroup | — | — | limited | The focusgroup global HTML attribute combines descendant elements into a single tab stop, with arrow-key navigation between them, for toolbars, tabs, menus, radio groups, and other composite controls. It's an alternative to the sequential navigation of tabindex. |
| font-synthesis-position | — | — | limited | The font-synthesis-position CSS property sets whether or not the browser should synthesize subscript and superscript typefaces when they're missing from the font. |
| font-variant-position | — | — | limited | The font-variant-position CSS property sets whether to use alternate glyphs for subscript and superscript text. |
| Gamepad VR hands and poses | — | — | limited | The hand and pose properties of a Gamepad object represent the position in space and the hand that WebVR controllers are held in. |
| Gamut mapping | — | — | limited | Colors in CSS and <canvas> elements can be defined out of range of an output device or the color space of the canvas. Gamut mapping brings the color into range while preserving hue and lightness. |
| getBoxQuads() | — | — | limited | The getBoxQuads() method, when called on a document, element, pseudo-element, or text node, returns the list of DOMQuad objects that represent the CSS boxes used to render the node. |
| Global privacy control | — | — | limited | The Sec-GPC request header indicates that the user does not consent to a website or service selling or sharing their personal information with third parties. |
| :has-slotted | — | — | limited | The :has-slotted CSS pseudo-class matches <slot> elements where the fallback content is not shown. The pseudo-class matches any slotted content, including white space, text nodes, or elements. |
| Heading offset | — | — | limited | The headingoffset HTML attribute offsets the heading level of descendant <h1>–<h6> elements. The headingreset HTML attribute prevents heading offset computation from traversing beyond the element. |
| Heading pseudo-classes | — | — | limited | The :heading and :heading() CSS pseudo-classes match headings of varying levels. The :heading pseudo-class matches any heading (<h1> through <h6>). The :heading() selector matches any of the given levels. For example, :heading(1, 2) matches headings level 1 and 2. |
| HTML media capture | — | — | limited | The capture HTML attribute for <input type="file"> elements allows the user to capture media using the device's camera or microphone. |
| HTML setter methods | — | — | limited | The setHTML(), replaceWithHTML(), beforeHTML(), prependHTML(), appendHTML() and afterHTML() DOM methods, and unsafe equivalents, insert HTML into an existing tree. |
| HTML streaming setters | — | — | limited | The streamHTML(), streamReplaceWithHTML(), streamBeforeHTML(), streamPrependHTML(), streamAppendHTML() and streamAfterHTML() DOM methods, and unsafe equivalents, return writeable streams that incrementally insert HTML into an existing tree. |
| image() | — | — | limited | The image() CSS function creates an image similar to url() but with additional functionality. It can create a solid color as an image, provide a fallback from an image URL to a solid color, or clip a sprite image using media fragments. Not to be confused with the Image() constructor. |
| ime-mode | — | — | limited | The ime-mode CSS property sets the state of the input method editor for text fields. |
| Import assertions | — | — | limited | Module import … assert { type: "json" } and import … assert { type: "css" } JavaScript statements load JSON and CSS data. |
| import defer | — | — | limited | The import defer and import.defer() JavaScript statements import a module while deferring its evaluation until its first use. |
| <install> | — | — | limited | The <install> HTML element represents a button that, upon activation, prompts the user to choose whether to install a progressive web app. |
| line-clamp | — | — | limited | The line-clamp CSS property limits the text in a block container to a certain number of lines. The prefixed -webkit-line-clamp is widely supported but only works with -webkit-box-orient: vertical in combination with display: -webkit-box or display: -webkit-inline-box. |
| Link parameters | — | — | limited | The link-parameters CSS property, param() modifier for the url() CSS function, and the #:~:param(…) URL fragment set custom CSS environment variables on an external resource, such as an SVG image, allowing the external resource to adapt its presentation based on the variables. |
| Magnetometer | — | — | limited | The Magnetometer API reads magnetic field sensor data from the device's magnetometer. |
| Web app manifest localization | — | — | limited | The _localized suffixed members of the web app manifest set translated names, descriptions, icons, and shortcuts. The browser automatically selects resources based on the user's language and region settings. |
| MathML Full | — | — | limited | MathML specifies several elements and attributes that are not included in MathML Core. Math applications outside of browsers may implement these features, but they are discouraged for web use. |
| @mixin | — | — | limited | The @mixin and @apply CSS at-rules define reusable style declaration fragments and apply them inside rules, optionally passing arguments. |
| Mutation events | — | — | limited | Mutation events like DOMSubtreeModified, DOMNodeInserted, or DOMNodeRemoved fire when DOM changes occur. |
| navigator.install() | — | — | limited | The navigator.install() method triggers a request to install a progressive web app. |
| Network Information | — | — | limited | The navigator.connection API provides information about the network connection a device is using and fires events when the connection type changes. |
| OpaqueRange | — | — | limited | The createValueRange() for form elements, such as <textarea> or <input type="text">, gets an OpaqueRange object that represents a live span of text. You can use this for range-based operations on the input text, such as setting custom highlights or placing autocomplete popovers. |
| overflow-clip-margin | — | — | limited | The overflow-clip-margin CSS property sets how far overflow content may appear outside the bounds of an element before it's clipped by effects such as overflow: clip. |
| OVR_multiview2 WebGL extension | — | — | limited | The OVR_multiview2 extension for WebGL 2.0 contexts renders into multiple views simultaneously. This especially useful for virtual reality (VR) and WebXR. |
| Portals | — | — | limited | The <portal> HTML element embeds another page into the current page as a non-interactive preview. |
| prefers-reduced-data media query | — | — | limited | The prefers-reduced-data CSS media query detects whether the user has a preference for using less network traffic. For example, you can use this media query to avoid loading large font files and use a system font instead. |
| Private network access | — | — | limited | The Access-Control-Request-Private-Network: true and Access-Control-Allow-Private-Network: true HTTP request and response headers establish permission for websites to make requests to internal networks, such as to routers. |
| Related apps | — | — | limited | The related_applications web app manifest member lists operating system-specific applications that are related to the current web app, such as an Android app that provides similar functionality. The getInstalledRelatedApps() method lists which of those are installed on the current device. |
| Integrity violation reports | — | — | limited | Subresource integrity violation reporting sends a report to a URL nominated by the Reporting-Endpoints header or the ReportingObserver API when a resource request violates an integrity check. |
| Retriable module loading | — | — | limited | You can retry importing a module that failed to import previously. Failed module imports, through the import JavaScript statement, the import() JavaScript syntax, or dynamically created <script src="…" type="module"> HTML elements, aren't cached. |
| Rhythmic sizing | — | — | limited | The line-height-step CSS property creates consistent vertical rhythm by setting the spacing between body text baselines. It rounds taller lines like headings up to the next multiple of the body text spacing. |
| Screen orientation lock | — | — | limited | The screen.orientation.lock() method prevents changes to the screen orientation, typically in fullscreen applications such as games. For example, while locked, rotating a phone to the side won't change the screen orientation from landscape to portrait. |
| Shared storage | — | — | limited | The sharedStorage API stores data to a shared space where the data can then be processed without the ability to track users across the different sites they visit. A common use case is measuring the reach of third-party ads without using user-tracking cookies. |
| image-rendering: smooth | — | — | limited | The image-rendering: smooth CSS declaration scales images while retaining a gradual color blending that is useful for photos. |
| speak | — | — | limited | The speak CSS property sets whether or not text should be spoken. |
| Speech recognition grammar | — | — | limited | The SpeechRecognition.grammars property of the Web Speech API represents a set of words or patterns of words that the recognition service should recognize, used for when the recognition service's accuracy is low. |
| Table styling | — | — | limited | Attributes and properties of table elements, such as align, vAlign, noWrap, bgcolor, or char set various visual presentation properties of the table and its sections and cells. |
| :target-within | — | — | limited | The :target-within CSS pseudo-class matches the element with an ID matching the URL fragment and its ancestors. |
| Topics | — | — | limited | The topics API reports a user's likely subject-matter interests (as determined by the browser, known as topics) to iframes. This allows for interest-based advertising that does not rely on user's exact browsing history, third-party cookies, or fingerprinting. |
| TransformStream transformer cancel() method | — | — | limited | The cancel() method of a TransformStream transformer cleans up resources when the readable side cancels or the writable side aborts. |
| <usermedia> | — | — | limited | The <usermedia> HTML element represents a button that, upon activation, toggles camera or microphone streams. If needed, it may prompt the user to choose whether to grant the page access to the camera and microphone. |
| video-dynamic-range media query | — | — | limited | The video-dynamic-range CSS media query sets styles based on whether a device can display video with at least standard range colors or at least high range colors. Non-visual devices will match neither. |
| Web NFC | — | — | limited | The NDEFReader API reads and writes messages to near-field communication (NFC) tags. |
| WebDriver | — | — | limited | The WebDriver protocol allows out-of-process programs to inspect and control browsers to, for example, run tests of web applications. Also known as WebDriver classic. |
| WebNN | — | — | limited | The WebNN API constructs and executes computational graphs of neural networks by making use of the various machine learning capabilities and hardware accelerators available on the device. Also known as Web Neural Network API. |
| WebVR | — | — | limited | The navigator.getVRDisplays() API represents virtual reality (VR) devices, including sensors and head-mounted displays. |
