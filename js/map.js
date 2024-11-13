const width = 960;
const height = 600;
let rotation = [260, -35];
let currentScale = 300;

const projection = d3.geoOrthographic()
    .scale(currentScale)
    .translate([width / 2, height / 2])
    .clipAngle(90);

const path = d3.geoPath().projection(projection);
const svg = d3.select("svg");
const tooltip = d3.select("#tooltip");

// 获取现有的 yearSlider 和 yearLabel 元素
const yearSlider = d3.select("#year-slider");
const yearLabel = d3.select("#year-label");

let dataByCountryAndYear = {};
let totalOBSByCountry = {}; // Store the total OBS_VALUE per country

// Load CSV data
d3.csv("cleaned/Health_employment_education(cleaned).csv").then(data => {
    data.forEach(d => {
        const country = d.Country;
        const year = d.TIME_PERIOD;
        const obsValue = +d.OBS_VALUE; // Convert OBS_VALUE to number

        if (!dataByCountryAndYear[country]) {
            dataByCountryAndYear[country] = {};
        }
        if (!dataByCountryAndYear[country][year]) {
            dataByCountryAndYear[country][year] = [];
        }
        dataByCountryAndYear[country][year].push({
            variable: d.Variable,
            value: obsValue
        });

        // Calculate the total OBS_VALUE per country
        if (!totalOBSByCountry[country]) {
            totalOBSByCountry[country] = {};
        }
        if (!totalOBSByCountry[country][year]) {
            totalOBSByCountry[country][year] = 0;
        }
        totalOBSByCountry[country][year] += obsValue;
    });

    const years = Array.from(new Set(data.map(d => d.TIME_PERIOD))).sort();
    yearSlider.attr("min", years[0])  // Set the min year dynamically
        .attr("max", years[years.length - 1])  // Set the max year dynamically
        .attr("value", years[0]);  // Set the initial value to the first year

    yearLabel.text("Year: " + years[0]);

    // Define the color scale for OBS_VALUE
    const colorScale = d3.scaleThreshold()
        .domain([0, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 5000000])
        .range(["#f7f7f7", "#fee8c8", "#fdbb84", "#fc8d59", "#e34a33", "#b30000", "#67000d", "#ffcc00", "#ffa500", "#ff0000"]);

    // Load GeoJSON and draw the map
    d3.json("json/world-geojson.json").then(function(worldData) {
        g.selectAll("path.land")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("class", "land")
            .attr("d", path)
            .attr("fill", d => {
                const country = d.properties.name;
                const obsTotal = totalOBSByCountry[country]?.[years[0]] || 0; // Default to first year
                return colorScale(obsTotal);
            })
            .on("click", clicked)
            .on("mouseover", mouseOver)
            .on("mousemove", mouseMove)
            .on("mouseout", mouseOut);
    });

    // Update colors when slider value changes
    yearSlider.on("input", function() {
        const selectedYear = this.value;
        yearLabel.text("Year: " + selectedYear);

        // Recalculate the max value for the selected year to dynamically update the color scale
        const obsValuesForYear = Object.values(totalOBSByCountry).map(countryData => countryData[selectedYear] || 0);
        const maxObsValue = d3.max(obsValuesForYear);

        // Update the color scale domain
        colorScale.domain([0, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, maxObsValue]);

        g.selectAll("path.land")
            .attr("fill", d => {
                const country = d.properties.name;
                const obsTotal = totalOBSByCountry[country]?.[selectedYear] || 0;
                return colorScale(obsTotal);
            });
    });
});

// Create SVG container and drag/zoom functionality
const g = svg.append("g");

g.append("path")
    .attr("class", "ocean")
    .attr("d", path({type: "Sphere"}));

const drag = d3.drag().on("drag", function(event) {
    const dx = event.dx;
    const dy = event.dy;
    rotation[0] += dx * 0.5;
    rotation[1] -= dy * 0.5;
    projection.rotate(rotation);
    update();
});

svg.call(drag);

const zoom = d3.zoom()
    .scaleExtent([100, 800])
    .on("zoom", function(event) {
        const newScale = event.transform.k;
        currentScale = newScale;
        projection.scale(currentScale);
        update();
    });

svg.call(zoom);
svg.call(zoom.transform, d3.zoomIdentity.scale(currentScale));

function clicked(event, d) {
    const selectedCountry = d.properties.name;
    const selectedYear = yearSlider.node().value;
    const countryData = dataByCountryAndYear[selectedCountry]?.[selectedYear];

    g.selectAll("path.land").classed("selected", false);
    d3.select(event.currentTarget).classed("selected", true);

    if (countryData) {
        const nonZeroData = countryData.filter(item => item.value > 0).slice(0, 20);

        if (nonZeroData.length > 0) {
            const details = nonZeroData.map(item => `${item.variable}: ${item.value}`).join("<br>");
            tooltip.style("opacity", 1)
                .html(`<strong>${selectedCountry}</strong><br><strong>Year: ${selectedYear}</strong><br>${details}`)
                .style("left", (event.pageX - 300) + "px")
                .style("top", (event.pageY - 400) + "px");
        } else {
            tooltip.style("opacity", 0);
        }
    } else {
        tooltip.style("opacity", 1)
            .html(`<strong>${selectedCountry}</strong><br><strong>Year: ${selectedYear}</strong><br>No data`)
            .style("left", (event.pageX -  300) + "px")
            .style("top", (event.pageY - 400) + "px");
    }
}

function mouseOver(event, d) {
    tooltip.style("opacity", 1)
        .html(d.properties.name);
}

function mouseMove(event) {
    tooltip.style("left", (event.pageX - 300) + "px")
        .style("top", (event.pageY - 400) + "px");
}

function mouseOut() {
    tooltip.style("opacity", 0);
}

d3.select("#zoom-in").on("click", function() {
    currentScale *= 1.2;
    projection.scale(currentScale);
    update();
});

d3.select("#zoom-out").on("click", function() {
    currentScale *= 0.8;
    projection.scale(currentScale);
    update();
});

function update() {
    g.selectAll("path.land").attr("d", path);
    g.selectAll("path.ocean").attr("d", path({type: "Sphere"}));
}

projection.rotate(rotation);
update();
