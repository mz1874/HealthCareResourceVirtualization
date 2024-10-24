const width = 960;
const height = 600;
let rotation = [260, -35];

// 创建球面投影
const projection = d3.geoOrthographic()
    .scale(300)  // 控制地球的大小
    .translate([width / 2, height / 2])  // 将球体置于画布中央
    .clipAngle(90);  // 裁剪不可见的背面部分

const path = d3.geoPath().projection(projection);

const svg = d3.select("svg");

// 创建提示框元素
const tooltip = d3.select("#tooltip");

// 添加一个组元素来包含所有的地图路径
const g = svg.append("g");

// 在球体底部添加海洋
g.append("path")
    .attr("class", "ocean")
    .attr("d", path({type: "Sphere"})); // 使用 Sphere 类型

// 加载 GeoJSON 文件
d3.json("json/world-geojson.json").then(function(worldData) {
    g.selectAll("path.land")
        .data(worldData.features)
        .enter()
        .append("path")
        .attr("class", "land")  // 设置类为 land，用于样式区分陆地
        .attr("d", path)
        .on("click", clicked)  // 点击事件
        .on("mouseover", mouseOver)  // 悬停事件
        .on("mousemove", mouseMove)
        .on("mouseout", mouseOut);
});

// 定义拖动行为
const drag = d3.drag()
    .on("drag", function(event) {
        const dx = event.dx;
        const dy = event.dy;

        // 更新旋转角度
        rotation[0] += dx * 0.5;  // 水平旋转
        rotation[1] -= dy * 0.5;  // 垂直旋转

        projection.rotate(rotation);  // 更新投影的旋转

        // 重新绘制地图和海洋
        update();
    });

svg.call(drag);  // 将拖动行为应用到 SVG

// 点击国家的回调函数
function clicked(event, d) {
    // 取消选择其他国家
    g.selectAll("path").classed("selected", false);

    // 选择点击的国家
    d3.select(this).classed("selected", true);

    // 显示国家名称
    tooltip.style("opacity", 1)
        .html(d.properties.name)  // 显示国家名称
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    console.log(d.properties.name);
}

// 鼠标悬停事件
function mouseOver(event, d) {
    tooltip.style("opacity", 1)
        .html(d.properties.name);  // 显示国家名称
}

// 鼠标移动事件
function mouseMove(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
}

// 鼠标移出事件
function mouseOut() {
    tooltip.style("opacity", 0);  // 隐藏提示框
}

// 添加按钮事件
d3.select("#zoom-in").on("click", function() {
    projection.scale(projection.scale() * 1.2);  // 放大球体
    update();  // 重新绘制地图和海洋
});

d3.select("#zoom-out").on("click", function() {
    projection.scale(projection.scale() * 0.8);  // 缩小球体
    update();  // 重新绘制地图和海洋
});

// 更新地图和海洋的函数
function update() {
    g.selectAll("path.land").attr("d", path);  // 重新绘制陆地
    g.selectAll("path.ocean").attr("d", path({type: "Sphere"}));  // 重新绘制海洋
}

// 设置默认旋转角度以居中在中国
projection.rotate(rotation);
update(); // 初始绘制地图和海洋