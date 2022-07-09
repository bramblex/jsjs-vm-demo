
// var quickSort = function (arr) {
// 	if (arr.length <= 1) { return arr; }
// 	var pivotIndex = Math.floor(arr.length / 2);
// 	var pivot = arr.splice(pivotIndex, 1)[0];
// 	var left = [];
// 	var right = [];
// 	for (var i = 0; i < arr.length; i++) {
// 		if (arr[i] < pivot) {
// 			left.push(arr[i]);
// 		} else {
// 			right.push(arr[i]);
// 		}
// 	}
// 	return quickSort(left).concat([pivot], quickSort(right));
// };
// console.log(quickSort([3, 6, 8, 2, 1, 9, 5, 7, 4]));

wx.showModal({
	title: '这是一段隐藏在图片中的代码',
	content: '这是一段隐藏在图片中的代码',
	success: function (res) {
		if (res.confirm) {
			page.setData({ motto: '用户点击确定' });
		} else if (res.cancel) {
			page.setData({ motto: '用户点击取消' });
		}
	}
})
