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

const yearsDropdown = d3.select("body")
    .append("select")
    .attr("id", "year-select")
    .style("position", "absolute")
    .style("top", "10px")
    .style("left", "10px");

let dataByCountryAndYear = {};
let totalOBSByCountry = {}; // Stores each country's OBS_VALUE sum

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

        // Calculate total OBS_VALUE for each country
        if (!totalOBSByCountry[country]) {
            totalOBSByCountry[country] = {};
        }
        if (!totalOBSByCountry[country][year]) {
            totalOBSByCountry[country][year] = 0;
        }
        totalOBSByCountry[country][year] += obsValue;
    });

    const years = Array.from(new Set(data.map(d => d.TIME_PERIOD))).sort();
    years.forEach(year => {
        yearsDropdown.append("option").attr("value", year).text(year);
    });

    // Define color scale for OBS_VALUE sum
    const colorScale = d3.scaleThreshold()
        .domain([0, 10, 20, 50, 100])
        .range(["#ccc", "#e0f7fa", "#b2ebf2", "#4dd0e1", "#00acc1", "#006064"]);

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

    // Update colors when year is changed
    yearsDropdown.on("change", function() {
        const selectedYear = this.value;
        console.log(`Current Year: ${selectedYear}`);

        // Remove the 'selected' class from all countries
        g.selectAll("path.land").classed("selected", false);

        g.selectAll("path.land")
            .attr("fill", d => {
                const country = d.properties.name;
                const obsTotal = totalOBSByCountry[country]?.[selectedYear] || 0; // Use optional chaining to avoid undefined error
                console.log(`Total OBS for ${country} in ${selectedYear}: ${obsTotal}`);
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
        projection.scale(newScale);
        update();
    });

svg.call(zoom);

// Click event to show details
function clicked(event, d) {
    const selectedCountry = d.properties.name;
    const selectedYear = yearsDropdown.node().value;
    const countryData = dataByCountryAndYear[selectedCountry]?.[selectedYear];

    g.selectAll("path.land").classed("selected", false);
    d3.select(event.currentTarget).classed("selected", true);

    if (countryData) {
        const details = countryData.map(item => `${item.variable}: ${item.value}`).join("<br>");
        tooltip.style("opacity", 1)
            .html(`<strong>${selectedCountry}</strong><br><strong>Year: ${selectedYear}</strong><br>${details}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
    } else {
        tooltip.style("opacity", 1)
            .html(`<strong>${selectedCountry}</strong><br><strong>Year: ${selectedYear}</strong><br>No data available`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
    }
}

// Tooltip hover functions
function mouseOver(event, d) {
    tooltip.style("opacity", 1)
        .html(d.properties.name);
}

function mouseMove(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
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
