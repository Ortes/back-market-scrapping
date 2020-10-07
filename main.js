const algoliasearch = require('algoliasearch');
const fs = require('fs');
const csvReadableStream = require('csv-reader');

const client = algoliasearch('9X8ZUDUNN9', '38f3a5eacb0bd01a763275f972706859');
const index = client.initIndex('prod_index_starting_from');

let inputStream = fs.createReadStream('CPU_UserBenchmarks.csv', 'utf8');

let data = [];

let promises = [];
for (var i = 0; i < 100; ++i) {
    promises.push(index.search('',
        {
            hitsPerPage: 1000,
            filters: 'category_2:"Ordinateurs & Co" AND price>=' + (200 + i * 10) + ' AND price<=' + (210 + i * 10)
        })
        .then((hits) => {
            hits.hits.forEach(x => data[x.backmarketID] = x);
        })
        .catch(e => console.log(e)));
}

Promise.all(promises)
    .then(() => matchUserbenchmark())
    .catch(e => console.log(e));


function matchUserbenchmark() {
    data = Object.values(data);
    inputStream
        .pipe(new csvReadableStream())
        .on('data', function (row) {
            data = data.map(x => {
                if (x && x.processor && x.processor.toUpperCase().includes(row[3].toUpperCase()))
                    x.processorBenchmark = parseFloat(row[5]).toFixed(2);
                return x;
            });
        })
        .on('end', () => toCsv());
}

Object.flatten = function (data) {
    var result = {};

    function recurse(cur, prop) {
        if (Object(cur) !== cur) {
            if (prop === 'price')
                result[prop] = parseFloat(cur).toFixed(2);
            else
                result[prop] = cur;
        } else if (Array.isArray(cur)) {
            result[prop] = cur.join(', ');
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + "." + p : p);
            }
            if (isEmpty && prop)
                result[prop] = {};
        }
    }

    recurse(data, "");
    return result;
};

function toCsv() {
    let lines = [];

    data = data.map(x => Object.flatten(x));
    var headers = new Set();
    data.forEach(x => Object.keys(x).forEach(e => headers.add(e)));
    headers = Array.from(headers);
    lines.push(headers.join(','));
    data.forEach(x => {
        var line = [];
        Object.values(headers).forEach(e => line.push('"' + (x[e] === undefined ? '' : String(x[e]).replace(/"/g, '')) + '"'));
        lines.push(line.join(','));
    });
    fs.writeFile('data.csv', lines.join('\n'), e => e ? console.log(e) : null);
}


