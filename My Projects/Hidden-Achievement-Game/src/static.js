
function haveSameElements(arr1, arr2) {
	if (arr1.length !== arr2.length) return false;

	const countMap = {};

	// Count elements in the first array
	for (const val of arr1) {
		countMap[val] = (countMap[val] || 0) + 1;
	}

	// Compare with the second array
	for (const val of arr2) {
		if (!countMap[val]) return false; // Element missing or too many duplicates
		countMap[val]--;
	}

	return true;
}

function haveSameOrder(arr1, arr2) {
	// same elements in the same order (haveSameElements ignores order)
	if (arr1.length !== arr2.length) return false;
	return arr1.every((val, i) => val === arr2[i]);
}





