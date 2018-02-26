const basics = {
  "exerpt": "Basics\n",
  "messages": [
    {
      "id": "9rn43y95og00",
      "content": "# Basics",
      "type": "header"
    },
    {
      "id": "t4odx4yxpc00",
      "content": "Catalog is a minimal markdown note app with a few extra features. ",
      "type": "none"
    },
    {
      "id": "8krtznam4w00",
      "content": "* Insert HTML directly",
      "type": "list"
    },
    {
      "id": "iia9ih1kw000",
      "content": "* Set document variables",
      "type": "list"
    },
    {
      "id": "zuf9hy2okg00",
      "content": "* Ingest data from APIs",
      "type": "list"
    },
    {
      "id": "4s60c2yaww00",
      "content": "### Markdown",
      "type": "header"
    },
    {
      "id": "ya4m55zvsg00",
      "content": "Catalog has a limited set of inline style such as `code`, *bold*, and _italic_",
      "type": "none"
    },
    {
      "id": "vf0u1v3n2o00",
      "content": "> A quotation is the repetition of one expression as part of another one, particularly when the quoted expression is well-known or explicitly attributed by citation to its original source, and it is indicated by quotation marks.",
      "type": "quote"
    },
    {
      "id": "9wo3fk2vf400",
      "content": "Syntax highlighting for code blocks:",
      "type": "none"
    },
    {
      "id": "5trqrtkfds00",
      "content": "```const tryAnnote = () => {\n  alert('Good idea!');\n};```",
      "type": "code"
    },
    {
      "id": "9fdmpt3rc000",
      "content": "### Links",
      "type": "header"
    },
    {
      "id": "esvrjaytk000",
      "content": "Pull in thumbnail previews for visual bookmarking",
      "type": "none"
    },
    {
      "id": "0tmxco5zg000",
      "content": "[www.area17.com]",
      "type": "url"
    },
    {
      "id": "loknwusv5c00",
      "content": "### Variables",
      "type": "header"
    },
    {
      "id": "7u0nsy8m1c00",
      "content": "You can set/change document variables which you can use throughout the note by calling its name in context.",
      "type": "none"
    },
    {
      "id": "os7o18jq6800",
      "content": "$favoriteColor: green;",
      "type": "variable"
    },
    {
      "id": "hev1hvkakw00",
      "content": "> My favorite color is $favoriteColor!",
      "type": "quote"
    },
    {
      "id": "0hwychiyqo00",
      "content": "### APIs",
      "type": "header"
    },
    {
      "id": "zzc7bxvznk00",
      "content": "You can pull in data from an API, inspect the syntax by editing the message below",
      "type": "none"
    },
    {
      "id": "39thmcoguo00",
      "content": "> Bitcoin is currently trading for `@https://api.gdax.com/products/BTC-USD/ticker@.price/`",
      "type": "quote"
    },
    {
      "id": "1w0p5tf17k00",
      "content": "### Math",
      "type": "header"
    },
    {
      "id": "mctxm34whc00",
      "content": "Do calculations with non-alphabetic characters.",
      "type": "none"
    },
    {
      "id": "fsg4aavokg00",
      "content": "32.4 * 67 / (400.01 * (2.5/9))",
      "type": "math"
    },
    {
      "id": "agivoa2y0g00",
      "content": "### Example",
      "type": "header"
    },
    {
      "id": "avufdsrru800",
      "content": "Heres how you would make a simple crypto tracker",
      "type": "none"
    },
    {
      "id": "y8hqqqi6r400",
      "content": "$ethOwned: 35.6;",
      "type": "variable"
    },
    {
      "id": "2lzc5xp89s00",
      "content": "$ethPrice: @https://api.gdax.com/products/ETH-USD/ticker@.price/;",
      "type": "variable"
    },
    {
      "id": "w2uh7s380000",
      "content": "($ethPrice * $ethOwned)",
      "type": "none"
    }
  ]
};
