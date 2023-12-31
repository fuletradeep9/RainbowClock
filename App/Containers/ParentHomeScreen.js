import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Swiper from 'react-native-swiper';
import Constants from '../Components/Constants';
import * as Helper from '../Lib/Helper';
import { Colors, Images, Metrics } from '../Themes';
import { PieChart } from 'react-native-svg-charts';
import Api from '../Services/Api';
import moment from 'moment';

import Tips from 'react-native-tips';

// Styles
import styles from './Styles/ParentHomeScreenStyles';
import BaseComponent from '../Components/BaseComponent';
import AnalogClock from '../Components/AnalogClock';
import { value } from 'deprecated-react-native-prop-types/DeprecatedTextInputPropTypes';
import images from "../Themes/Images";
// Global Variables
const objSecureAPI = Api.createSecure();

export default class ParentHomeScreen extends BaseComponent {
  static navigationOptions = ({ navigation }) => ({
    headerStyle: {
      backgroundColor: Colors.navHeaderLight,
      shadowOpacity: 0,
      shadowOffset: { height: 0 },
      elevation: 0,
      height: Metrics.navBarHeight,
      borderBottomWidth: 0,
    },
  });

  //constructor event
  constructor(props) {
    super(props);

    //tips array ,Tips you want to show in home page
    this.homeTips = new Tips.Waterfall(Constants.PARENT_HOME_SCREEN_TIPS, {
      onEnd: async () => {
        try {
          AsyncStorage.setItem(
            Constants.PARENT_HOME_TIPS,
            JSON.stringify(false),
          );
        } catch (error) { }
      },
    });

    this.state = {
      school: false,
      modalVisible: false,
      clockFormateImage: images.am,
      taskComplete: false,
      objSelectedChild: [],
      is_24HrsClock: false,
      showDropdown: false,
      arrWeekDays: [],
      selectedDay: '',
      meridiam: '',
      pieData: [],
      pieDataPM: [],
      pieDataAM: [],
      pieData24Hour: [],
      pieDataAM_School: [],
      pieDataPM_School: [],
      pieData24Hour_School: [],
      arrFooterTasks: [],
      isLoading: false,
      isRewardClaimed: false,
      tipsVisible: null,
      pauseUserInteraction: true,
    };

    this.handleNextTips = this.handleNextTips.bind(this);
  }

  //show next tips
  handleNextTips() {
    const tipsVisible = this.homeTips.next();
    console.log('tipsVisible', tipsVisible);
    this.setState({ tipsVisible });
  }

  //start showing tips in home
  start() {
    this.setState({
      tipsVisible: this.homeTips.start(),
    });
  }

  //#region -> Component Methods
  componentDidMount = async () => {
    super.componentDidMount();
    this.getClockDetail();
    this.getChildDetail();
    var date, TimeType, hour;

    // Creating Date() function object.
    date = new Date();

    // Getting current hour from Date object.
    hour = date.getHours();

    // Checking if the Hour is less than equals to 11 then Set the Time format as AM.
    if (hour <= 11) {
      TimeType = 'AM';
    }
    else {
      // If the Hour is Not less than equals to 11 then Set the Time format as PM.
      TimeType = 'PM';
    }

    this.state.meridiam = Helper.getCurrentTimeMeridian();
    const upComingDays = Helper.getUpcominSevenDays();
    this.setState({
      arrWeekDays: upComingDays,
      selectedDay: upComingDays[0],
    });

    setTimeout(() => {
      this.setState({ pauseUserInteraction: false });
    }, 3000);

    //check tips is already show or not in home if not then start showing tips
    AsyncStorage.getItem(Constants.PARENT_HOME_TIPS, (err, value) => {
      if (err) {
        console.log(err);
      } else {
        let isShowTime = JSON.parse(value);
        if (isShowTime != null) {
          console.log('isShowTime', isShowTime);
          if (isShowTime) {
            this.start();
          } else {
            this.homeTips.options.disabled = true;
          }
        }
      }
    });
  };
  //#endregion

  //#region -> Class Methods

  getClockDetail = async () => {
    const isTFClock = await AsyncStorage.getItem(Constants.KEY_IS_24HRS_CLOCK);
    if (child != '' && isTFClock == 'true') {
      this.state.is_24HrsClock = true;
    }
  };

  getChildDetail = () => {
    AsyncStorage.getItem(Constants.KEY_SELECTED_CHILD, (err, child) => {
      console.log('=======>>>child', child);
      if (child != '') {
        this.setState({ objSelectedChild: JSON.parse(child) }, () =>
          this.getTaskList(),
        );
      }
    });
  };

  toggleSwitch() {
    this.state.is_24HrsClock = !this.state.is_24HrsClock;
    this.setWatchData();
    try {
      AsyncStorage.setItem(
        Constants.KEY_IS_24HRS_CLOCK,
        JSON.stringify(this.state.is_24HrsClock),
      );
    } catch (error) {
      console.log('AsyncStorage Error: ', error);
    }
    this.setState({ pieData });
  }

  toggleSchool() {
    if (this.state.is_24HrsClock) {
      this.toggleSwitch();
    }
    this.setState(
      {
        school: !this.state.school,
      },
      () => this.setWatchData(),
    );
  }

  onPressMoveToSetUpTimeBlock = () => {
    this.props.navigation.navigate('SetupTimeBlockScreen');
  };

  onPressMoveToSchedule = () => {
    this.props.navigation.navigate('ScheduleScreen');
  };

  toggleDropdown() {
    this.setState({ showDropdown: !this.state.showDropdown });
  }

  selectDayForClock = day => {
    this.setState({ selectedDay: day }, () => this.getTaskList());
    this.toggleDropdown();
  };

  setWatchData() {
    pieData = '';
    if (this.state.is_24HrsClock) {
      pieData = this.state.school
        ? this.state.pieData24Hour_School
        : this.state.pieData24Hour;
    } else if (this.state.meridiam == 'am') {
      pieData = this.state.school
        ? this.state.pieDataAM_School
        : this.state.pieDataAM;
    } else {
      pieData = this.state.school
        ? this.state.pieDataPM_School
        : this.state.pieDataPM;
    }
    if (this.state.currentTaskSlot) {
      Helper.getPaginatedArray(
        this.state.currentTaskSlot[0].tasks,
        4,
        arrFooterTasks => {
          this.setState({ arrFooterTasks });
        },
      );
    }
    this.setState({
      pieData,
    });
  }

  renderClockView() {
    data = this.state.pieData;
    const clearColor = Colors.clear;
    var date, TimeType, hour;

    // Creating Date() function object.
    date = new Date();

    // Getting current hour from Date object.
    hour = date.getHours();

    // Checking if the Hour is less than equals to 11 then Set the Time format as AM.
    if (hour <= 11) {
      TimeType = 'AM';
    }
    else {
      // If the Hour is Not less than equals to 11 then Set the Time format as PM.
      TimeType = 'PM';
    }
    // const pieData = data.map(({value, isEmpty, color}, index) => ({
    //   value,
    //   svg: {
    //     fill:
    //       isEmpty && !color
    //         ? this.state.school
    //           ? Colors.gray
    //           : clearColor
    //         : color,
    //     onPress: () => console.log('press', index),
    //   },
    //   key: `pie-${index}`,
    //   index: index,
    // }));
    const pieData = data.map(({ value, isEmpty, color }, index) => ({
      value,
      svg: {
        fill:
          isEmpty && !color
            ? this.state.school
              ? Colors.gray
              : clearColor
            : color,
        // fill: this.state.school ?!color ? Colors.black:Colors.blue:Colors.bloodOrange,
        // fill:color,
        
        onPress: () => console.log('press', index),
      },
      key: `pie-${index}`,
      // key: `pie-5`,
      index: index,
      
    }));
    // console.log('CLOCK', value+'==> '+ this.state.school);
    const pieDataTras = data.map(({ taskId, value, isEmpty }, index) => ({
      value,
      svg: {
        fill: clearColor,
        onPress: () => this.onPressMoveToSetUpTimeBlock(),
      },
      key: `pie-${index}`,
      index: index,
    }));
    // const clockFormateImage = this.state.is_24HrsClock
    //   ? Images.clockFaceDigit24HRS
    //   : Images.clockFaceDigit;
    if (this.state.is_24HrsClock) {
      this.state.clockFormateImage = Images.clockFaceDigit24HRS;
    }
      else if (hour >= 0 && hour < 6) {
        this.state.clockFormateImage = images.am
      }
      else if (hour >= 6 && hour < 12) {
        this.state.clockFormateImage = images.am_pm
      }
      else if (hour >= 12 && hour < 18) {
        this.state.clockFormateImage = images.pm
      }
      else if (hour >= 18 && hour < 24) {
        this.state.clockFormateImage = images.pm_am
      }
    
    console.log('PIEDATA', JSON.stringify(data))
    return (
      <TouchableOpacity
        style={styles.clock}
        onPress={() => {
          this.onPressMoveToSetUpTimeBlock();
        }}>
        <Image source={this.state.school ? Images.clockPurpleLight : Images.clock} style={styles.clockImage} />

        <View style={styles.clockTimerView}>
          <PieChart
            style={styles.clockChartView}
            data={pieData}
            innerRadius={0}
            outerRadius={0}
            padAngle={0}
            sort={(a, b) => {
              console.log('test', a.index, b.index+1);
              return a.index > b.index;
            }}
          />
          <Image
            source={this.state.clockFormateImage}
            resizeMode={'contain'}
            style={styles.clockChartView}
          />
          <AnalogClock hourFormate={this.state.is_24HrsClock ? 24 : 12} />

          <PieChart
            style={styles.clockChartView}
            data={pieDataTras}
            outerRadius="100%"
            innerRadius="1%"
            padAngle={0}
            sort={(a, b) => {
              return a.index > b.index;
            }}
          />
        </View>
      </TouchableOpacity>
    );
  }

  renderFooterView() {
    const pagesCount = this.state.arrFooterTasks.length;
    const pages = [...new Array(pagesCount)].map((item, index) => {
      return this.renderPage(index);
    });
    return pages;
  }

  renderPage(pageIndex) {
    const itemsCount = this.state.arrFooterTasks[pageIndex].length;
    const item = [...new Array(itemsCount)].map((item, index) => {
      return this.renderFooterItem(pageIndex, index);
    });
    return <View style={styles.footerIconList}>{item}</View>;
  }

  renderFooterItem(pageIndex, index) {
    const task = this.state.arrFooterTasks[pageIndex][index];
    return (
      <TouchableOpacity style={styles.iconTouch}>
        <Image
          source={{ uri: task.cate_image }}
          style={
            task.status == Constants.TASK_STATUS_COMPLETED
              ? styles.fadedIcon
              : styles.icon
          }
        />
      </TouchableOpacity>
    );
  }
  //#endregion

  //#region -> API Call
  getTaskList = () => {
    this.setState({ isLoading: true });
    const aDate = Helper.dateFormater(
      this.state.selectedDay,
      'dddd DD MMMM YYYY',
      'YYYY-MM-DD',
    );
    objSecureAPI
      .childTasksList(this.state.objSelectedChild.id, '', aDate)
      .then(response => {
        console.log('CHILD TASK LIST ✅✅✅', JSON.stringify(response));
        if (response.ok) {
          if (response.data.success) {
            let arr = [];
            if (response.data.data.length > 0) {
              const tasks = response.data.data[0].tasks;
              this.state.isRewardClaimed = response.data.data[0].is_claimed;
              this.state.isRewardClaimed == true
                ? this.callClearRewardNotification()
                : null;
              Object.keys(tasks).map(item => {
                arr.push({ time: item, tasks: tasks[item] });
              });
              this.setState({ arrTasks: arr, arrFilteredTasks: arr });
              const todaysSchoolHours =
                response.data.data[0].school_hours[Helper.getTodaysDay()];
              console.log('TODAYS 222', response.data.data[0].school_hours)
              const schoolHoursFrom = moment(
                todaysSchoolHours ? todaysSchoolHours.FROM : '00:00',
                'hh:mm A',
              );
              const schoolHoursTo = moment(
                todaysSchoolHours ? todaysSchoolHours.TO : '00:00',
                'hh:mm A',
              );
              const schoolHoursFromMeradian = schoolHoursFrom.format('A');
              const schoolHoursToMeradian = schoolHoursTo.format('A');
              Helper.setupTasksBasedOnMeridiem(
                this.state.arrTasks,
                schoolHoursFrom,
                schoolHoursTo,
                (arrAM, arrPM, runningTimeSlot, arrAM_School, arrPM_School) =>
                  setTimeout(() => {
                    this.setupTaskData(
                      arrAM,
                      arrPM,
                      runningTimeSlot,
                      arrAM_School,
                      arrPM_School,
                      todaysSchoolHours,
                      schoolHoursFromMeradian,
                      schoolHoursToMeradian,
                    );
                  }, 200),
              );
            }
          } else {
            Helper.showErrorMessage(response.data.message);
          }
        } else {
          this.setState({ isLoading: false });
          Helper.showErrorMessage(response.problem);
        }
      })
      .catch(error => {
        this.setState({ isLoading: false });
        console.log(error);
      });
  };

  setupTaskData(
    arrAM,
    arrPM,
    runningTimeSlot,
    arrAM_School,
    arrPM_School,
    todaysSchoolHours,
    schoolHoursFromMeradian,
    schoolHoursToMeradian,
  ) {
    {
      this.state.isLoading = false;
      const pieDataAM = Helper.generateClockTaskArray(arrAM, 'am');
      const pieDataPM = Helper.generateClockTaskArray(arrPM, 'pm');
      // const pieDataAM_School = Helper.generateClockTaskArray(arrAM_School,"am",true);
      // const pieDataPM_School = Helper.generateClockTaskArray(arrPM_School,"pm",true);
      var pieDataAM_School = [];
      var pieDataPM_School = [];
      console.log('TODAYS School Hours', todaysSchoolHours)
      if (todaysSchoolHours) {
        console.log('TODAYS School Hours111111', schoolHoursFromMeradian + ' ' + schoolHoursToMeradian)
        if (schoolHoursFromMeradian != schoolHoursToMeradian) {
          console.log(
            'schoolHoursFromMeradian != schoolHoursToMeradian',
            schoolHoursFromMeradian,
            schoolHoursToMeradian,
          );
          pieDataAM_School = Helper.generateClockTaskArraySchool(
            arrAM_School,
            'am',
            todaysSchoolHours.FROM,
            '11:59 AM',
            '',
            true,
          );
          pieDataPM_School = Helper.generateClockTaskArraySchool(
            arrPM_School,
            'pm',
            '12:00 PM',
            todaysSchoolHours.TO,
            '',
            true,
          );
        } else {
          console.log(
            'schoolHoursFromMeradian',
            schoolHoursFromMeradian,
            schoolHoursToMeradian,
          );
          pieDataAM_School = Helper.generateClockTaskArraySchool(
            arrAM_School,
            'am',
            todaysSchoolHours.FROM,
            todaysSchoolHours.TO,
            schoolHoursFromMeradian,
          );
          pieDataPM_School = Helper.generateClockTaskArraySchool(
            arrPM_School,
            'pm',
            todaysSchoolHours.FROM,
            todaysSchoolHours.TO,
            schoolHoursFromMeradian,
          );
        }
      }
      this.state.currentTaskSlot = runningTimeSlot;
      pieData24Hour = [...pieDataAM, ...pieDataPM];
      pieData24Hour_School = [...pieDataAM_School, ...pieDataPM_School];
      meridian = Helper.getCurrentTimeMeridian();

      this.setState(
        {
          meridian,
          pieDataPM,
          pieDataAM,
          pieData24Hour,
          pieDataAM_School,
          pieDataPM_School,
          pieData24Hour_School,
        },
        () => this.setWatchData(),
      );
    }
  }

  callClearRewardNotification() {
    objSecureAPI
      .clearRewardNotification(this.state.objSelectedChild.id)
      .then(response => {
        console.log('Clear Reward Count  ✅✅✅', JSON.stringify(response));
        if (response.ok) {
          if (response.data.success) {
          }
        } else {
          this.setState({ isLoading: false });
          Helper.showErrorMessage(response.problem);
        }
      })
      .catch(error => {
        this.setState({ isLoading: false });
        console.log(error);
      });
  }
  //#endregion

  //#region -> View Render
  renderRow(item, index) {
    return (
      <TouchableOpacity
        style={styles.dropdownItem}
        onPress={() => this.selectDayForClock(item)}>
        <Text style={styles.dropdownItemText}>{item}</Text>
      </TouchableOpacity>
    );
  }

  render() {
    const renderPagination = (index, total, context) => {
      return null;
    };
    return (
      <View
        style={styles.mainContainer}
        pointerEvents={this.state.isLoading ? 'none' : 'auto'}>
        {/* <Tips
          contentStyle={styles.contentStyle}
          tooltipContainerStyle={[
            styles.tooltipContainerStyle,
            {
              left: '50%',
              top: Helper.isIPhoneX() ? 190 : 170,
            },
          ]}
          style={styles.Tips}
          tooltipArrowStyle={styles.tooltipArrowStyle}
          visible={this.state.tipsVisible === 'colorWedge'}
          onRequestClose={this.handleNextTips}
          text="Press the coloured wedge to show tasks"
          textStyle={styles.tipstextStyle}
        /> */}

        <Tips
          contentStyle={[
            styles.contentStyle,
            {
              maxWidth: 200,
            },
          ]}
          tooltipContainerStyle={[
            styles.tooltipContainerStyle,
            {
              left: '50%',
              top: Helper.isIPhoneX() ? 190 : 170,
            },
          ]}
          style={[styles.Tips]}
          tooltipArrowStyle={styles.tooltipArrowStyle}
          textStyle={styles.tipstextStyle}
          visible={this.state.tipsVisible === 'bell'}
          onRequestClose={this.handleNextTips}
          text="Tap the bell to setup the school hour tasks"
        />

        <Tips
          contentStyle={[styles.contentStyle, { left: null, right: 0 }]}
          visible={this.state.tipsVisible === 'rewards'}
          onRequestClose={this.handleNextTips}
          text="Setup rewards for your child in the menu"
          style={[styles.Tips, { left: null, right: 0 }]}
          tooltipArrowStyle={styles.tooltipArrowStyle}
          textStyle={styles.tipstextStyle}
          tooltipContainerStyle={[
            styles.tooltipContainerStyle,
            {
              left: null,
              right: 20,
              top: Helper.isIPhoneX() ? 190 : 170,
            },
          ]}
        />

        <ImageBackground
          source={Images.blueBackground}
          style={styles.backgroundImage}>
          <View style={[styles.container]}>
            <View style={styles.containerBody}>
              <View style={styles.clockHeader}>
                <View style={styles.userName}>
                  <Text style={styles.userNameText}>
                    {' '}
                    {this.state.objSelectedChild &&
                      this.state.objSelectedChild.name
                      ? // ? this.state.objSelectedChild.name.toUpperCase() + "’S CLOCK"
                      this.state.objSelectedChild.name.toUpperCase() +
                      '’S CLOCK'
                      : ''}
                  </Text>
                </View>
                <Text
                  style={[styles.title, styles.textCenter, styles.titleSmall, { marginBottom: 20 }]}>
                  {/* {'TAP THE CALENDAR TO CREATE A BLOCK OF TIME/SCHEDULE'.toUpperCase()} */}
                  {/* {'TAP THE CLOCK TO SELECT A BLOCK OF TIME'.toUpperCase()} */}
                </Text>
              </View>
              <View style={styles.clockBody}>{this.renderClockView()}</View>
              <View style={styles.clockBottom}>
                <View style={[styles.clockBottomItem, styles.clockBottomLeft]}>
                  <TouchableOpacity
                    style={styles.bellTouch}
                    onPress={() => this.toggleSchool()}>
                    {!this.state.school ? (
                      <Image source={Images.bell} style={styles.bell} />
                    ) : (
                      <Image source={Images.school} style={styles.school} />
                    )}
                  </TouchableOpacity>
                  {this.state.school ? null : (
                    <TouchableOpacity
                      style={[
                        styles.Switch,
                        this.state.is_24HrsClock
                          ? styles.switch24Hrs
                          : styles.switch12Hrs,
                      ]}
                      onPress={() => this.toggleSwitch()}>
                      {this.state.is_24HrsClock ? (
                        <View style={styles.SwitchButton24Hrs} />
                      ) : null}
                      <Text
                        style={
                          this.state.is_24HrsClock
                            ? styles.SwitchText24Hrs
                            : styles.SwitchText
                        }>
                        {this.state.is_24HrsClock ? '24hr' : '12hr'}
                      </Text>
                      {!this.state.is_24HrsClock ? (
                        <View style={styles.SwitchButton} />
                      ) : null}
                    </TouchableOpacity>
                  )}
                  {/* <TouchableOpacity style={[styles.Switch, this.state.is_24HrsClock ? styles.switch24Hrs : styles.switch12Hrs]} onPress={() => this.toggleSwitch()}>
                                        <Text style={styles.SwitchText}>{this.state.is_24HrsClock ? '24hr' : '12hr'}</Text>
                                        <View style={styles.SwitchButton}></View>
                                    </TouchableOpacity> */}
                </View>
                <View
                  style={[
                    styles.clockBottomItem,
                    styles.clockBottomRight,
                    styles.center,
                  ]}>
                  <TouchableOpacity
                    onPress={() => this.onPressMoveToSchedule()}>
                    <Image
                      source={Images.navIcon3}
                      style={styles.calendarIcon}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.clockBottomItem,
                    styles.clockBottomRight,
                    styles.center,
                  ]}>
                  {this.state.isRewardClaimed == true ? (
                    <View style={[styles.clockBottomRight]}>
                      <TouchableOpacity activeOpacity={1}>
                        <View style={[styles.shapeContainer]}>
                          <View style={[styles.shapeView]}>
                            <Image
                              source={Images.shapeRight}
                              style={styles.shapeRight}
                            />
                            <View
                              style={[
                                styles.shape,
                                { width: Metrics.screenWidth / 5.5 },
                              ]}>
                              <Text style={[styles.shapeText]}>
                                {'A reward \nhas been \nclaimed!'}
                              </Text>
                            </View>
                          </View>
                          {this.state.school === true ?(
                          <Image
                            source={Images.schoolBus}
                            style={styles.alarmClock}
                          />
                          ):null}
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : (
                   null
                  )}
                   {this.state.school === true ?(
                     <Image
                     source={Images.schoolBus}
                     style={styles.alarmClock}
                   />
                   ):null}
                </View>
              </View>
            </View>
            {this.state.showDropdown ? (
              <TouchableOpacity
                style={styles.bodyClose}
                onPress={() => this.toggleDropdown()}
              />
            ) : null}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => this.toggleDropdown()}>
                <Text style={styles.dropdownButtonText}>
                  {this.state.selectedDay
                    ? this.state.selectedDay
                    : 'SELECT DAY'}
                </Text>
                <Image source={Images.downarrow} style={styles.downarrow} />
              </TouchableOpacity>
              {this.state.showDropdown ? (
                <View style={styles.dropdown}>
                  <FlatList
                    keyboardShouldPersistTaps={'always'}
                    data={this.state.arrWeekDays}
                    extraData={this.state}
                    keyExtractor={(item, index) => index}
                    renderItem={({ item, index }) => this.renderRow(item, index)}
                    contentContainerStyle={{ padding: 15 }}
                  />
                </View>
              ) : null}
            </View>
          </View>
          <SafeAreaView
            style={[
              { justifyContent: 'center' },
              this.state.currentTaskSlot && this.state.arrFooterTasks.length > 0
                ? {
                  backgroundColor:
                    this.state.currentTaskSlot[0].tasks[0].color,
                }
                : null,
            ]}>
            <View
              style={[
                styles.footer,
                { justifyContent: 'center' },
                this.state.currentTaskSlot &&
                  this.state.arrFooterTasks.length > 0
                  ? {
                    backgroundColor:
                      this.state.currentTaskSlot[0].tasks[0].color,
                  }
                  : null,
              ]}>
              {this.state.isLoading ? (
                <View>
                  <Text style={styles.smallWaitText}>
                    {Constants.TEXT_FATCHING_TASKS}
                  </Text>
                </View>
              ) : this.state.currentTaskSlot &&
                this.state.arrFooterTasks.length > 0 ? (
                <Swiper
                  showsButtons={true}
                  key={this.state.currentTaskSlot.length}
                  nextButton={
                    <Image source={Images.next} style={styles.footerArrow} />
                  }
                  prevButton={
                    <Image source={Images.prev} style={styles.footerArrow} />
                  }
                  renderPagination={renderPagination}
                  loop={false}>
                  {this.renderFooterView(this.state.currentTaskSlot)}
                </Swiper>
              ) : (
                <View>
                  <Text style={styles.smallWaitText}>
                    {Constants.TEXT_NO_TASKS}
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }
  //#endregion
}
