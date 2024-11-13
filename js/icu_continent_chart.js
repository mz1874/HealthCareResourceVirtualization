// Set up SVG dimensions with increased width and right margin for the legend
const svgWidth = 900, svgHeight = 500;
const margin_icu = { top: 40, right: 150, bottom: 80, left: 60 };
const chartWidth = svgWidth - margin_icu.left - margin_icu.right;
const chartHeight = svgHeight - margin_icu.top - margin_icu.bottom;

const svg_icu = d3.select("#chart-container svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("background-color", "#ffffff")
    .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.1)");

// Add chart title
svg_icu.append("text")
    .attr("x", (svgWidth / 2))
    .attr("y", margin_icu.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("ICU Bed Usage across OECD Continents");

// Create chart group to apply margins
const chart = svg_icu.append("g")
    .attr("transform", `translate(${margin_icu.left},${margin_icu.top})`);

// Tooltip for displaying bar segment information
const tooltip_icu = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background", "#fff")
    .style("color", "#333")
    .style("padding", "8px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.2)");

// Define the color scale for ICU types
const colorScale = d3.scaleOrdinal()
    .domain(["Paediatric ICU", "Total ICU Beds", "Adult ICU", "Critical Care Adult ICU", "Neonatal ICU"])
    .range(["#FFBC42", "#D81159", "#8F2D56", "#218380", "#73D2DE"]);

// Set up scales for the x and y axes
const xScale = d3.scaleBand().range([0, chartWidth]).padding(0.3);
const yScale = d3.scaleLinear().range([chartHeight, 0]);

// Set up x and y axes
const xAxis = chart.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .attr("class", "axis");

const yAxis = chart.append("g").attr("class", "axis");

// Load the CSV data
d3.csv("cleaned/ICU_BED_USE.csv").then(function(data) {
    // Parse numerical values
    data.forEach(d => {
        d.Year = +d.Year;
        d.OBS_VALUE = +d.OBS_VALUE;
    });

    // Extract unique ICU types, continents, and years
    const icuTypes = Array.from(new Set(data.map(d => d.ICU_Type)));
    const continents = Array.from(new Set(data.map(d => d.Continent)));
    const years = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);

    // Set up color scale for ICU types
    const icuTypeColors = d3.scaleOrdinal()
        .domain(icuTypes)
        .range(icuTypes.map(type => colorScale(type)));

    // Set up x-axis based on continents
    xScale.domain(continents);

    // Create legend for ICU types
    const legendContainer = svg_icu.append("g")
        .attr("transform", `translate(${chartWidth + margin_icu.left + 20}, ${margin_icu.top})`);

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

    // Function to update the chart based on the selected year
    function updateChart(selectedYear) {
        // Update the year display
        d3.select("#year-display").text(selectedYear);

        // Filter the data for the selected year
        let yearData = data.filter(d => d.Year === selectedYear);

        // Prepare stacked data for each continent
        const stackedData = continents.map(continent => {
            const continentData = yearData.filter(d => d.Continent === continent);
            const row = { Continent: continent };
            icuTypes.forEach(type => {
                row[type] = continentData.find(d => d.ICU_Type === type)?.OBS_VALUE || 0;
            });
            return row;
        });

        // Define stack generator
        const stack = d3.stack().keys(icuTypes);

        // Set y-axis domain based on the data's max ICU bed usage
        yScale.domain([0, d3.max(stackedData, d => d3.sum(icuTypes, type => +d[type]))]);

        // Bind data to groups and create bars for each ICU type
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
                        tooltip_icu.transition().duration(300).style("opacity", 1);
                        tooltip_icu.html(`ICU Type: ${icuType}<br>Value: ${(d[1] - d[0]).toFixed(2)}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip_icu.transition().duration(300).style("opacity", 0);
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

        // Add annotations for continents with missing data
        chart.selectAll(".no-data-label").remove();
        stackedData.forEach(d => {
            if (d3.sum(icuTypes, type => +d[type]) === 0) {
                chart.append("text")
                    .attr("class", "no-data-label")
                    .attr("x", xScale(d.Continent) + xScale.bandwidth() / 2)
                    .attr("y", chartHeight - 10)
                    .attr("text-anchor", "middle")
                    .style("fill", "#888")
                    .style("font-size", "12px")
                    .text("No Data Available");
            }
        });

        // Update the axes
        xAxis.transition().duration(800).call(d3.axisBottom(xScale));
        yAxis.transition().duration(800).call(d3.axisLeft(yScale));
    }

    // Initialize the chart with the first year
    updateChart(years[0]);

    // Adjust the slider to cover 2010-2020 and add event listener
    const yearSlider = document.getElementById("year-slider_bar");
    yearSlider.setAttribute("min", 2010);
    yearSlider.setAttribute("max", 2020);
    yearSlider.addEventListener("input", function() {
        updateChart(+this.value);
    });
});
