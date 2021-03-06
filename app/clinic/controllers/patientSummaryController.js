(function () {
  'use strict';

  angular.module('clinic')
    .controller('PatientSummaryController', PatientSummaryController);

  PatientSummaryController.$inject = ['$rootScope', '$stateParams', 'encounterService', 'observationsService',
    'commonService', '$filter', 'spinner', 'prescriptionService', 'patientService'];

  /* @ngInject */
  function PatientSummaryController($rootScope, $stateParams, encounterService, observationsService, commonService,
                                    $filter, spinner, prescriptionService, patientService) {
    var patientUuid = $stateParams.patientUuid;
    var patient = {};
    var vm = this;

    vm.displayLimits = [
      {id: 1, display: "All", value: -1},
      {id: 2, display: "2", value: 2},
      {id: 3, display: "4", value: 4},
      {id: 4, display: "6", value: 6},
      {id: 5, display: "12", value: 12},
      {id: 6, display: "24", value: 24}
    ];

    vm.displayLimit = _.find(vm.displayLimits, function (item) {
      return item.value === +$rootScope.defaultDisplayLimit;
    });

    vm.filterDate = filterDate;
    vm.isObject = isObject;
    vm.updateDisplayLimit = updateDisplayLimit;

    activate();

    ////////////////

    function activate() {
      updateDisplayLimit(vm.displayLimit);
    }

    function dropSizeToLimit(list) {
      if (_.isUndefined(list)) return;
      var size = _.size(list);

      if (vm.displayLimit.value === -1) return list;

      if (vm.displayLimit.value > size) return list;

      return _.slice(list, 0, vm.displayLimit.value);
    }

    function updateDisplayLimit() {
      spinner.forPromise(getPatient()
        .then(function (p) { patient = p; })
        .then(initVisitHistory)
        .then(initLabResults)
        .then(initDiagnosis)
        .then(initICD10Diagnosis)
        .then(initPharmacyPickups)
        .then(initPharmacyPickupsNew)
        .then(initPrescriptions)
        .then(initAllergies)
        .then(initVitals));
    }

    function initVisitHistory() {
      return encounterService.getEncountersOfPatient(patientUuid).success(function (data) {
        vm.visits = dropSizeToLimit(commonService.filterGroupReverse(data));
      });
    }

    function initLabResults() {
      var labEncounterUuid = "e2790f68-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file

      return encounterService.getEncountersForEncounterType(patientUuid, labEncounterUuid).success(function (data) {
        vm.labs = commonService.filterGroupReverse(data);
      });
    }

    function initDiagnosis() {
      var concepts = ["e1cdd38c-1d5f-11e0-b929-000c29ad1d07",
        "e1e2b07c-1d5f-11e0-b929-000c29ad1d07",
        "e1d608cc-1d5f-11e0-b929-000c29ad1d07",
        "e1e5232a-1d5f-11e0-b929-000c29ad1d07",
        "e1e529a6-1d5f-11e0-b929-000c29ad1d07",
        "e1d2984a-1d5f-11e0-b929-000c29ad1d07",
        "e1dac2ae-1d5f-11e0-b929-000c29ad1d07",
        "e1dac3da-1d5f-11e0-b929-000c29ad1d07",
        "e1dac574-1d5f-11e0-b929-000c29ad1d07",
        "e1e2530c-1d5f-11e0-b929-000c29ad1d07",
        "e1e52898-1d5f-11e0-b929-000c29ad1d07",
        "e1e29fa6-1d5f-11e0-b929-000c29ad1d07",
        "e1daf922-1d5f-11e0-b929-000c29ad1d07",
        "e1dce93a-1d5f-11e0-b929-000c29ad1d07"
      ];//TODO: create in configuration file

      return observationsService.findAll(patientUuid).success (function (data) {
        var filtered = observationsService.filterByList(data.results, concepts);//TODO: filter must be dome in backend system
        var ordered = _.sortBy(filtered, function (obs) {
          return obs.obsDatetime;
        });
        vm.diagnosis = dropSizeToLimit(ordered);
      });
    }

    function initICD10Diagnosis() {
      var concept = "e1eb7806-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file

      return observationsService.getObs(patientUuid, concept).success (function (data) {
        var filtered = commonService.filterRetired(data.results);//TODO: filter must be dome in backend system
        vm.icdDiagnosis = dropSizeToLimit(filtered);
      });
    }

    function initPharmacyPickups() {
      var pharmacyEncounterUuid = "e279133c-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file

      return encounterService.getEncountersForEncounterType(patientUuid, pharmacyEncounterUuid).success(function (data) {
        vm.pickups = dropSizeToLimit(commonService.filterGroupReverse(data));
      });
    }

    function initPharmacyPickupsNew() {
      var patientUuid = $stateParams.patientUuid;
      var pharmacyEncounterTypeUuid = "18fd49b7-6c2b-4604-88db-b3eb5b3a6d5f";

      return encounterService.getEncountersForEncounterType(patientUuid, pharmacyEncounterTypeUuid).success(function (data) {
        var nonRetired = prepareDispenses(commonService.filterReverse(data));
        vm.newPickups = dropSizeToLimit(nonRetired);

      });
    }

    function prepareDispenses(encounters) {

      var dispenses = [];

      _.forEach(encounters, function (encounter) {
        var dispense = {};
        dispense.detetime = encounter.encounterDatetime;
        dispense.provider = encounter.provider;
        dispense.items = [];
        _.forEach(encounter.obs, function (obs) {

          if(obs.groupMembers){
            var item = {};
            item.order = obs.groupMembers[0].order;
            item.quantity = commonService.findByMemberConcept(obs.groupMembers, "e1de2ca0-1d5f-11e0-b929-000c29ad1d07");
            item.returnDate = commonService.findByMemberConcept(obs.groupMembers, "e1e2efd8-1d5f-11e0-b929-000c29ad1d07");

            dispense.items.push(item);
          }
        });
        dispenses.push(dispense);
      });

      return dispenses;
    }

    //TODO: Remove this duplicated function
    function initPrescriptions() {
      return prescriptionService.getAllPrescriptions(patient).then(function (patientPrescriptions) {
        vm.hasServiceToday = (hasActivePrescription(patientPrescriptions)) ? true : null;
        vm.prescriptions = patientPrescriptions.reverse();
        setPrescritpionItemStatus(vm.existingPrescriptions);
      });
    }

    //TODO: Remove this duplicated function
    function hasActivePrescription(prescriptions){
      return _.find(prescriptions, function (prescription) {
        return prescription.prescriptionStatus === true;
      });
    }

    //TODO: Remove this duplicated function
    function setPrescritpionItemStatus(prescriptions){
      _.forEach(prescriptions, function (prescription) {
        _.forEach(prescription.prescriptionItems, function (item) {
          if(prescription.prescriptionStatus === true){
            if((item.drugOrder.action === 'NEW') ||(item.drugOrder.action === 'REVISE') ){
              item.status = "PHARMACY_ACTIVE";
            }
            else{
              item.status = "PHARMACY_FINALIZED";
            }
          }
          else{
            item.status = "PHARMACY_FINALIZED";
          }
        });
      });
    }

    function initAllergies() {
      var concepts = ["e1e07ece-1d5f-11e0-b929-000c29ad1d07", "e1da757e-1d5f-11e0-b929-000c29ad1d07"];

      var adultFollowupEncounterUuid = "e278f956-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file
      var childFollowupEncounterUuid = "e278fce4-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file

      return encounterService.getEncountersForEncounterType(patient.uuid,
        (patient.age.years >= 15) ? adultFollowupEncounterUuid : childFollowupEncounterUuid)
        .success(function (data) {
          vm.allergies = dropSizeToLimit(commonService.filterGroupReverseFollowupObs(concepts, data.results));

        });
    }

    function initVitals() {
      var concepts = ["e1e2e934-1d5f-11e0-b929-000c29ad1d07",
        "e1e2e826-1d5f-11e0-b929-000c29ad1d07",
        "e1da52ba-1d5f-11e0-b929-000c29ad1d07",
        "e1e2e70e-1d5f-11e0-b929-000c29ad1d07",
        "e1e2e3d0-1d5f-11e0-b929-000c29ad1d07"
      ];//TODO: create in configuration file

      var adultFollowupEncounterUuid = "e278f956-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file
      var childFollowupEncounterUuid = "e278fce4-1d5f-11e0-b929-000c29ad1d07";//TODO: create in configuration file

      return encounterService.getEncountersForEncounterType(patient.uuid,
        (patient.age.years >= 15) ? adultFollowupEncounterUuid : childFollowupEncounterUuid)
        .success(function (data) {
          vm.vitals = dropSizeToLimit(commonService.filterGroupReverseFollowupObs(concepts, data.results));

        });
    }

    function isObject(value) {
      return _.isObject(value);
    }

    function filterDate(obs) {
      if (obs.concept.uuid === "892a98b2-9c98-4813-b4e5-0b434d14404d"
        || obs.concept.uuid === "e1e2efd8-1d5f-11e0-b929-000c29ad1d07") {
        return $filter('date')(obs.value, "MMM d, y");
      }

      return obs.value;
    }

    function getPatient() {
      return patientService.getPatient(patientUuid);
    }



    observationsService
      .getLastPatientObs(patientUuid, Bahmni.Common.Constants.BMI)
      .then(function (data) {
          vm.patientVitals = data;
      }).catch(function (data) {

    });



  }

})();
