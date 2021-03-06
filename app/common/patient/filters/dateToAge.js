angular.module('common.patient')
.filter('dateToAge', function($filter) {
	return function(birthDate, referenceDate) {
		var DateUtil = Bahmni.Common.Util.DateUtil;
		referenceDate = referenceDate || DateUtil.now();
		var age = DateUtil.diffInYearsMonthsDays(birthDate, referenceDate);
		return $filter('age')(age);
	};
});
