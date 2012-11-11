(function () {
	'use strict';

	var forEach = Array.prototype.forEach;
	var columnWidthOccupied = 640;
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || 
								window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

	// robertPenner 动画公式
	// time, begin, change, duration
	var tween = {
		PI: 3.14,
		easeInOut: function (t, b, c, d) {
			return -c/2 * (Math.cos(this.PI*t/d) - 1) + b;
		},
		linear: function (t, b, c, d) {
			return c*t/d + b;
		},
		easeIn: function () {
			return -c * Math.cos(t/d * (this.PI/2)) + c + b;
		}
	};

	// 获取内容区 contentBox的高度
	function getAvailableHeight(el) {
		var style = getComputedStyle(el);
		var paddingTop = parseInt(style.paddingTop,10) || 0;
		var paddingBottom = parseInt(style.paddingBottom,10) || 0;
		var height = el.clientHeight;
		return height - paddingTop - paddingBottom;
	}

	// 实际占用的高度 marginBox
	function getOccupiedHeight(el) {
		var style = getComputedStyle(el);
		var marginTop = parseInt(style.marginTop,10) || 0;
		var marginBottom = parseInt(style.marginBottom,10) || 0;
		var height = el.clientHeight;
		return height + marginTop + marginBottom;
	}
	
	// 是否应该计入总高度的计算
	function shouldCountClientHeightIn(el) {
		if(!el) {
			return false;
		}
		if(!el.clientHeight) {
			return false;
		}
		var position = getComputedStyle(el).position;
		return !/absolute|fixed/.test(position);
	}

	// 获取子节点的高度计算总高度
	function getOccupiedHeightTotal(el) {
		var childs = el.childNodes;
		var totalHeight = 0;
		var child;
		for(var i=0,l=childs.length;i<l;i++) {
			child = childs[i];
			if(!shouldCountClientHeightIn(child)) {
				continue;
			}
			totalHeight += getOccupiedHeight(child);
		}
		return totalHeight;
	}
	
	// boxHeight为父盒子的最大高度
	// el的子节点为待放置的子盒子
	// 计算总共需要多少个父盒子才能容纳下所有的子盒子
	function caculateColumnsCount(el, boxHeight) {
		var childs = el.childNodes;
		var columns = 1;
		var child;
		var occupiedHeight;
		var availableHeight = boxHeight;
		for(var i=0,l=childs.length;i<l;i++) {
			child = childs[i];
			if(!shouldCountClientHeightIn(child)) {
				continue;
			}
			occupiedHeight = getOccupiedHeight(child);
			//console.log([occupiedHeight,availableHeight]);
			if(occupiedHeight<=availableHeight) {
				availableHeight -= occupiedHeight;
			} else {
				columns += 1;
				availableHeight = boxHeight - occupiedHeight;
			}
		}
		return columns;
	}
	
	// 获取content节点
	function getContent() {
		return document.querySelector(".content");
	}

	// 绑定鼠标滚轮事件
	function bindMouseWheel(el) {
		el.addEventListener("mousewheel", onMouseWheel,false);
	}

	// 滚动内容区，定位title
	function contentScrollTo(content, scrollLeft) {
		var sections = content.querySelectorAll('section');
		var section;
		var sectionWidth;
		var totalWidth = 0;
		// 确定要需要处理的section
		for(var i=0,l=sections.length;i<l;i++) {
			section = sections[i];
			sectionWidth = section.clientWidth;
			totalWidth += sectionWidth;
			if (scrollLeft < totalWidth) {
				//console.log('scroll to section -> ' + i);
				break;
			}
		}

		// 重新定位title
		var title = section.querySelector('h2');
		var left;
		var leftMax;
		if (title) {
			leftMax = section.clientWidth - columnWidthOccupied;
			left = scrollLeft + section.clientWidth - totalWidth;
			title.style.left = Math.min(left, leftMax) + 'px';
		}
		content.scrollLeft = scrollLeft;
	}

	// 平滑滚动
	function doScroll(content) {
		var self = doScroll;
		var nextPosition = tween.linear(self.time,self.begin,self.change, self.duration);
		contentScrollTo(content,Math.ceil(nextPosition));
		//console.log(nextPosition);
		if (self.time >= self.duration) {
			self.scrolling = false;
			//console.log('done');
			return;
		}
		requestAnimationFrame(function () {
			self.time++;
			doScroll(content);
		});
	}

	// 鼠标滚动
	function handleDelta(delta) {
		if(doScroll.scrolling) {
			return;
		}
		var content = getContent();
		var different;
		// 不是列宽的整数倍时自动调整到整数倍
		var adjustment = content.scrollLeft % columnWidthOccupied;
		// adjustment=0; //禁用每次滚动到达列宽的整数倍机制
		if(content.scrollLeft <= 0 ) {
			if (delta > 0) { // 到达左边界
				return;
			}
			different = -columnWidthOccupied * delta;
		} else if (content.scrollLeft >= (content.scrollWidth - content.clientWidth)) {
			if ( delta<0 ) { // 到达右边界
				return;
			}
			adjustment = adjustment || columnWidthOccupied;
			different = -adjustment;
		} else {
			different = -(columnWidthOccupied * delta + adjustment);
		}
		doScroll.time = 0;
		doScroll.change = different;
		doScroll.begin = content.scrollLeft;
		doScroll.duration = 24;
		doScroll.scrolling = true;
		doScroll(content);
	}

	// 鼠标滚轮事件
	function onMouseWheel(e) {
		e.preventDefault();
		var delta = 0;
		if (e.wheelDelta) {
			delta = e.wheelDelta/120;
		}
		if(delta < 0) {
			handleDelta(-1);
		} else {
			handleDelta(1);
		}
	}

	// 对内容区进行重新排版
	function layoutContent() {
		var content = getContent();
		var sections = content.querySelectorAll("section");
		forEach.call(sections, function (section) {
			var columnsCount = caculateColumnsCount(section,getAvailableHeight(section));
			section.style.width = (columnWidthOccupied * columnsCount) + 'px';
			//console.log(columnsCount);
		});
	}

	// DOMReady
	function onDomReady() {
		var content = getContent();
		layoutContent();
		bindMouseWheel(content);
	}

	// window.resize
	function onResize() {
		layoutContent();
	}


	window.addEventListener("resize", onResize, false);
	document.addEventListener("DOMContentLoaded", onDomReady, false);
}());
