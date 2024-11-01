// Set up SVG dimensions with increased width and right margin for the legend
const svgWidth = 900, svgHeight = 500;
const margin = { top: 40, right: 150, bottom: 80, left: 60 }; // Increased bottom margin for timeslider
const chartWidth = svgWidth - margin.left - margin.right;
const chartHeight = svgHeight - margin.top - margin.bottom;

// Create the SVG canvas
const svg = d3.select("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("background-color", "#ffffff")
    .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.1)");

// Create chart group to apply margins
const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip for displaying bar segment information
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Define the color scale based on the gradient provided
const colorScale = d3.scaleLinear()
    .domain([0, 0.25, 0.5, 0.75, 1]) // Define stops in the gradient
    .range(["#FFD700", "#FF8C00", "#FF00FF", "#8B008B", "#00008B"]); // Yellow, Orange, Magenta, Deep Purple, Dark Blue

// Scales for x (continents) and y (ICU beds)
const xScale = d3.scaleBand().range([0, chartWidth]).padding(0.3);
const yScale = d3.scaleLinear().range([chartHeight, 0]);

// Create and position x and y axes
const xAxis = chart.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .attr("class", "axis");

const yAxis = chart.append("g").attr("class", "axis");

// Load the CSV file and process the data
d3.csv("ICU_BED_USE_2k15.csv").then(function(data) {
    // Parse numerical values
    data.forEach(d => {
        d.Year = +d.Year; // Convert Year to a number
        d.OBS_VALUE = +d.OBS_VALUE; // Convert OBS_VALUE to a number
    });

    // Extract unique ICU types, continents, and years
    const icuTypes = Array.from(new Set(data.map(d => d.ICU_Type))); // Unique ICU types
    const continents = Array.from(new Set(data.map(d => d.Continent))); // Unique continents
    const years = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b); // Unique years sorted

    // Define colors for each ICU type using the custom gradient
    const icuTypeColors = d3.scaleOrdinal()
        .domain(icuTypes)
        .range(icuTypes.map((_, i) => colorScale(i / (icuTypes.length - 1)))); // Assign each ICU type a unique color

    // Set up x-axis based on continents
    xScale.domain(continents);

    // Create a legend container
    const legendContainer = svg.append("g")
        .attr("transform", `translate(${chartWidth + margin.left + 20}, ${margin.top})`);

    // Add legend items for each ICU type
    icuTypes.forEach((type, i) => {
        const legendItem = legendContainer.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        legendItem.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("fill", icuTypeColors(type))
            .style("stroke", "#ccc")
            .style("stroke-width", 0.5);

        legendItem.append("text")
            .attr("x", 25)
            .attr("y", 12)
            .text(type)
            .style("font-size", "14px")
            .style("font-weight", "500")
            .style("fill", "#333")
            .attr("alignment-baseline", "middle");
    });

    // Function to update the chart based on the selected year from the timeslider
    function updateChart(selectedYear) {
        // Update the displayed year
        d3.select("#year-display").text(selectedYear);

        // Filter data for the selected year
        let yearData = data.filter(d => d.Year === selectedYear);

        // Prepare data for stacking by continent
        const stackedData = continents.map(continent => {
            const continentData = yearData.filter(d => d.Continent === continent);
            const row = { Continent: continent };
            icuTypes.forEach(type => {
                row[type] = continentData.find(d => d.ICU_Type === type)?.OBS_VALUE || 0; // Assign OBS_VALUE or 0 if missing
            });
            return row;
        });

        // Define stack generator
        const stack = d3.stack().keys(icuTypes);

        // Set y-axis domain based on the data's max ICU bed usage
        yScale.domain([0, d3.max(stackedData, d => d3.sum(icuTypes, type => +d[type]))]);

        // Bind data to groups and create a bar for each ICU type
        const groups = chart.selectAll(".stack")
            .data(stack(stackedData))
            .join("g")
            .attr("class", "stack")
            .attr("fill", d => icuTypeColors(d.key));

        groups.selectAll("rect")
            .data(d => d)
            .join(
                enter => enter.append("rect")
                    .attr("x", d => xScale(d.data.Continent))
                    .attr("width", xScale.bandwidth())
                    .attr("y", chartHeight)
                    .attr("height", 0)
                    .on("mouseover", function(event, d) {
                        const icuType = d3.select(this.parentNode).datum().key;
                        tooltip.transition().duration(200).style("opacity", 0.9);
                        tooltip.html(`Year: ${selectedYear}<br>ICU Type: ${icuType}<br>Value: ${(d[1] - d[0]).toFixed(2)}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition().duration(500).style("opacity", 0);
                    })
                    .transition()
                    .duration(800)
                    .attr("y", d => yScale(d[1]))
                    .attr("height", d => yScale(d[0]) - yScale(d[1])),
                update => update
                    .transition()
                    .duration(800)
                    .attr("x", d => xScale(d.data.Continent))
                    .attr("width", xScale.bandwidth())
                    .attr("y", d => yScale(d[1]))
                    .attr("height", d => yScale(d[0]) - yScale(d[1]))
            );

        // Update axes
        xAxis.transition().duration(800).call(d3.axisBottom(xScale));
        yAxis.transition().duration(800).call(d3.axisLeft(yScale));
    }

    // Initialize chart with the first year in the data
    updateChart(years[0]);

    // Timeslider for year selection
    const timeslider = d3.select("body").append("div")
    .attr("class", "timeslider-container"); // Apply the styling class
    
    timeslider.append("span").text("Year:");
    timeslider.append("span").attr("id", "year-display").text(years[0]);

    timeslider.append("input")
        .attr("type", "range")
        .attr("min", d3.min(years))
        .attr("max", d3.max(years))
        .attr("step", 1)
        .attr("value", d3.min(years))
        .style("width", `${chartWidth}px`)
        .on("input", function() {
            updateChart(+this.value); // Update chart with selected year
        });
});
