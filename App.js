import React, { Component } from 'react'
import { StyleSheet, View, Dimensions, Text, Platform } from 'react-native'
import { DangerZone, GestureHandler, Font, Icon
} from 'expo'

const { Animated } = DangerZone
const {
  PanGestureHandler,
  TapGestureHandler,
  State,
} = GestureHandler

const { height } = Dimensions.get('window');

const MonoText = props => (
  <Text {...props} style={[props.style, { fontFamily: 'space-mono' }]} />
)
const P = (android, ios) => Platform.OS === 'ios' ? ios : android;

const magic = {
  damping: P(9, 7),
  mass: 0.3,
  stiffness: 121.6,
  overshootClamping: true,
  restSpeedThreshold: 0.1,
  restDisplacementThreshold: 0.1,
  deceleration: 0.999,
  bouncyFactor: 1,
  velocityFactor: P(1, 1.2),
  dampingForMaster: 50,
  tossForMaster: 0.4,
  coefForTranslatingVelocities: 5

} // pls do it better

const {
  damping,
  dampingForMaster,
  mass,
  stiffness,
  overshootClamping,
  restSpeedThreshold,
  restDisplacementThreshold,
  deceleration,
  bouncyFactor,
  velocityFactor,
  coefForTranslatingVelocities,
  tossForMaster
} = magic;



const { set, cond, onChange, block, eq, greaterOrEq, lessOrEq, call, not, defined, max, add, and, sqrt, Value, abs, spring, or, divide, greaterThan, sub,event, diff, multiply, clockRunning, startClock, stopClock, decay, Clock, lessThan } = Animated

const moreOrLessEq = (a, b, c = 20) => lessThan(abs(sub(a, b)), c)


function withEnhancedLimits(val, min, max, state, springClock, masterOffseted, masterClock, snapPoint, masterVelocity, velocity, masterClockForOverscroll, overval, overspeed, shouldRevert, usif) {
  const prev = new Animated.Value(0)
  const limitedVal = new Animated.Value(0)
  const diffPres = new Animated.Value(0)
  const flagWasRunSpring = new Animated.Value(0)
  const wasRunMaster = new Animated.Value(0)
  const revertive = new Animated.Value(0);
  const flagFF = new Animated.Value(0)
  const ppp = new Animated.Value(0)
  return block([
    set(flagFF, 0),
    cond(eq(state, State.BEGAN),[
      set(prev, val),
      set(flagWasRunSpring, 0),
      stopClock(springClock),
      stopClock(masterClockForOverscroll),
      set(wasRunMaster, 0),
    ], [
      cond(or(and(eq(state, State.END), or(lessThan(limitedVal, min), greaterThan(limitedVal, max))), flagWasRunSpring),
        [
          //   call([shouldRevert], console.warn),
          set(flagWasRunSpring, 1),
          cond(lessThan(limitedVal, min),
            set(limitedVal, runSpring(springClock, limitedVal, diff(limitedVal), min))
          ),
          cond(greaterThan(limitedVal, max),
            [
             set(limitedVal, runSpring(springClock, limitedVal, velocity, max))
            ]
          ),
        ],
        [

          //cond(
          //  greaterThan(accumulativeOffset, 0),
         //   set(accumulativeOffset,add(accumulativeOffset, sub(prev, val))),
          set(revertive, limitedVal),
          set(limitedVal, add(limitedVal, sub(val, prev))),
          usif,

          cond(shouldRevert,
            [
              set(overval, add(overval, sub(val, prev))),
              set(overspeed, velocity),
             // call([overval, sub(prev, val)], (v) => console.warn("VFV", v)),
              set(limitedVal, revertive),
              set(flagFF, 1),
              set(velocity, 0),
            ]),
         // ),
          cond(lessThan(limitedVal, min),
            // derivate of sqrt
            [
              // revert
             // set(limitedVal, sub(limitedVal, sub(val, prev))),
              set(limitedVal, sub(limitedVal, sub(val, prev))),

              // and use derivative of sqrt(x)
              set(limitedVal,
                sub(limitedVal,
                  multiply(
                    (divide(1, multiply(bouncyFactor, sqrt(abs(sub(min, sub(limitedVal, sub(prev, val)))))))),
                    (sub(prev, val))
                  )
                )
              ),
            ],

          ),
          set(diffPres, sub(prev, val)),
          set(prev, val),
        ]
      ),
    ]),
    cond(greaterOrEq(limitedVal, 0), [
      cond(eq(state, State.ACTIVE),
      ),
      cond(and(eq(state, State.END), or(clockRunning(masterClockForOverscroll), not(wasRunMaster))),[

        set(overval, 0),
        set(overspeed, 0),
      ]),
      [
        cond(not(flagFF),
          [
            call([overval], ([c]) => console.log("mmm", c)),
            set(overval, limitedVal),
            set(overspeed, velocity),
          ]
          ),
        0
      ]
    ], limitedVal)
  ])
}

function runDecay(clock, value, velocity, wasStartedFromBegin) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  }

  const config = { deceleration }

  return [
    cond(clockRunning(clock), 0, [
      cond(wasStartedFromBegin, 0, [
        set(wasStartedFromBegin, 1),
        set(state.finished, 0),
        set(state.velocity, multiply(velocity, velocityFactor)),
        set(state.position, value),
        set(state.time, 0),
  //      call([clock], console.warn),
        startClock(clock),
      ]),
    ]),
    // set(state.position, value),
    decay(clock, state, config),
    cond(state.finished, stopClock(clock)),
    state.position,
  ]
}

function withPreservingMultiplicativeOffset (val, state) {
  const prev = new Animated.Value(1)
  const valWithPreservedOffset = new Animated.Value(1)
  return block([
    cond(eq(state, State.BEGAN), [
      set(prev, 1)
    ], [
      set(valWithPreservedOffset, multiply(valWithPreservedOffset, divide(val, prev))),
      set(prev, val),
    ]),
    valWithPreservedOffset
  ])
}

function withPreservingAdditiveOffset(drag, state) {
  const prev = new Animated.Value(0)
  const valWithPreservedOffset = new Animated.Value(0)
  return block([
    cond(eq(state, State.BEGAN), [
      set(prev, 0)
    ], [
      set(valWithPreservedOffset, add(valWithPreservedOffset, sub(drag, prev))),
      set(prev, drag),
    ]),
    valWithPreservedOffset
  ])
}

function withDecaying(drag, state, decayClock, velocity, prevent){
  const valDecayed = new Animated.Value(0)
  const offset = new Animated.Value(0)
  const wasStartedFromBegin = new Animated.Value(0)
  return block([
    cond(eq(state, State.END),
      [
        cond(prevent,
          stopClock(decayClock),
          set(valDecayed, runDecay(decayClock, add(drag, offset), velocity, wasStartedFromBegin))
        )
      ],
      [
        stopClock(decayClock),
        set(prevent, 0),
        cond(eq(state, State.BEGAN), [
          set(wasStartedFromBegin, 0),
          set(offset, add(sub(valDecayed, drag)))
        ]),
        set(valDecayed, add(drag, offset))
      ],
    ),
    valDecayed,
  ])
}


function runSpring(clock, value, velocity, dest, damping = damping, wasRun = false, unblock = 0) {
  const state = {
    finished: new Value(0),
    velocity: new Value(0),
    position: new Value(0),
    time: new Value(0),
  }

  const config = {
    damping,
    mass,
    stiffness,
    overshootClamping,
    restSpeedThreshold,
    restDisplacementThreshold,
    toValue: new Value(0),
  }

  return [
    cond(clockRunning(clock), 0, [
      set(state.finished, 0),
      set(state.velocity, velocity),
      set(state.position, value),
      set(config.toValue, dest),
      cond(wasRun, 0, startClock(clock)),
      wasRun ? cond(defined(wasRun), set(wasRun, 1)) : 0,
    ]),
    spring(clock, state, config),
    cond(and(state.finished, clockRunning(clock)), [
      unblock,
   //   call([clock], ([p]) => console.warn(p, v === 2)),
      stopClock(clock)
    ]),
    state.position,
  ]
}


export default class Example extends Component {
  static defaultProps = {
    snapPoints: [600, 300, 150],
    initialSnap: 0,
  }
  constructor(props) {
    super(props)
    const dragY = new Value(0)
    const panState = new Value(0)
    this.tapState = new Value(0)
    const velocity = new Value(0)

    const dragMasterY = new Value(0)
    const panMasterState = new Value(0)
    const masterVelocity = new Value(0)
    const overdrag = new Animated.Value(0)
    const overspeed = new Animated.Value(0)



    this.handlePan = event([
      {
        nativeEvent: ({
          translationY: dragY,
          state: panState,
          velocityY: velocity
        })
      },
    ])


    this.handleMasterPan = event([
      {
        nativeEvent: ({
          translationY: dragMasterY,
          state: panMasterState,
          velocityY: masterVelocity
        })
      },
    ])

    this.state = Example.getDerivedStateFromProps(props);
    const { snapPoints } = this.state
    const middlesOfSnapPoints = [];
    for (let i = 1; i < snapPoints.length; i++) {
      middlesOfSnapPoints.push(divide(add(snapPoints[i - 1] + snapPoints[i]), 2));
    }


    const masterOffseted = new Animated.Value(snapPoints[props.initialSnap]);

    // destination point is a approximation of movement if finger released
    const destinationPoint = add(masterOffseted, multiply(tossForMaster, masterVelocity));


    // method for generating condition for finding the nearest snap point
    const currentSnapPoint = (i = 0) => i + 1 === snapPoints.length ?
      snapPoints[i] :
      cond(
        lessThan(destinationPoint, middlesOfSnapPoints[i]),
        snapPoints[i],
        currentSnapPoint(i + 1)
      );
    // current snap point desired
    const snapPoint = currentSnapPoint();

    const masterClock = new Clock()
    const masterClockForOverscroll = new Clock()


    const prevMasterDrag = new Animated.Value(0)
    const wasRun = new Animated.Value(0)
    const preventDecaying = new Animated.Value(0)
    const shouldStop = new Animated.Value(1);


    const shouldRelevantOverscroll = and(

      or(
        greaterThan(overdrag, 0),
        and(not(eq(overdrag, 0)), not(moreOrLessEq(masterOffseted, this.state.snapPoints[0])))
      ),

      eq(panState, State.ACTIVE));


    const unblockScrollIfNeeded = block([
      cond(moreOrLessEq(masterOffseted, this.state.snapPoints[0], 20), set(shouldStop, 0), set(shouldStop, 1)),

    ])
    this.translateMaster = block([
      cond(and(or(eq(panMasterState, State.END), eq(panMasterState, 0)), not(shouldRelevantOverscroll)),
        [
         set(prevMasterDrag, 0),
         cond(or(clockRunning(masterClock), not(wasRun)),[
           set(preventDecaying, 1),

           set(masterOffseted, runSpring(masterClock, masterOffseted, masterVelocity, snapPoint, dampingForMaster, wasRun, unblockScrollIfNeeded, 2))
           ]
         ),
        ],
        [
          stopClock(masterClock),
          masterClockForOverscroll,
          set(preventDecaying, 1),
          cond(shouldRelevantOverscroll, [
            set(dragMasterY, overdrag),
            set(masterVelocity, overspeed),
            set(wasRun, 0) //IIII
          ]),
          set(masterOffseted, add(masterOffseted, sub(dragMasterY, prevMasterDrag))),
          set(prevMasterDrag, dragMasterY),
          cond(eq(panMasterState, State.BEGAN),
            [
              set(dragMasterY, 0),
              set(dragMasterY, 0), //unrelevanting offset
              stopClock(masterClockForOverscroll),
              set(wasRun, 0),
            ]
          ),
        ]
      ),
      max(masterOffseted, snapPoints[0])
    ])

    this.handleTap = event([
      {
        nativeEvent: {
          state: this.tapState
        }
      },
    ])

    this.decayClock = new Clock()
    this.springClock = new Clock()
    this.Y = withEnhancedLimits(withDecaying(withPreservingAdditiveOffset(dragY, panState), panState, this.decayClock, velocity, preventDecaying), -2000, 0, panState, this.springClock, masterOffseted, masterClock, snapPoint, masterVelocity, velocity, masterClockForOverscroll, overdrag, overspeed, shouldStop, unblockScrollIfNeeded)
  }

  panRef = React.createRef();
  wasRunningBeforeTap = new Animated.Value(0);

  renderInner = () => (
    <React.Fragment>
      {[...Array(60)].map((e, i) => (
        <View key={i} style={{ height: 40, backgroundColor: `#${i%10}88424` }}>
          <MonoText>
            computed
          </MonoText>
        </View>
      ))}
    </React.Fragment>
  )

  state = {
    ready: false,
    heightOfHeader: 0,
    heightOfContent: 0
  }

  handleLayoutHeader = ({ nativeEvent: {
    layout: {
      height : heightOfHeader
    }
  } }) => this.setState({
    heightOfHeader
  })

  handleLayoutContent = ({ nativeEvent: {
    layout: {
      height : heightOfContent
    }
  } }) => this.setState({
    heightOfContent
  })

  static getDerivedStateFromProps(props) {
    return {
      snapPoints: props.snapPoints.map(p => height - p)
    }
  }

  componentDidMount(){
    Font.loadAsync({
      // This is the font that we are using for our tab bar
      ...Icon.Ionicons.font,
      // We include SpaceMono because we use it in HomeScreen.js. Feel free
      // to remove this if you are not using it in your app
      'space-mono': require('./assets/fonts/SpaceMono-Regular.ttf'),
    }).then(() => this.setState({
      ready: true
    }))
  }

  render() {
    if (!this.state.ready) {
      return null;
    }
    return (
      <View style={styles.container}>
        <Animated.View style={{
          width: '100%',
          transform: [
            {
              translateY: this.translateMaster
            }
          ]
        }}>
          <PanGestureHandler
            onGestureEvent={this.handleMasterPan}
            onHandlerStateChange={this.handleMasterPan}
          >
            <Animated.View
              onLayout={this.handleLayoutHeader}
            >
              <View style={{
                height: 40,
                backgroundColor: 'red'
              }}>
                <Text>
                  123
                </Text>
              </View>
            </Animated.View>
          </PanGestureHandler>
          <View
            style={{
              height: this.props.snapPoints[0] - this.state.heightOfHeader,
              overflow: 'hidden'
            }}
          >
            <Animated.Code exec={onChange(this.tapState, cond(eq(this.tapState, State.BEGAN), [
              stopClock(this.decayClock),
             // set(this.pd, 1),
              set(this.wasRunningBeforeTap, clockRunning(this.springClock)),
              stopClock(this.springClock),
            ],[
              cond(eq(this.tapState, State.END), cond(this.wasRunningBeforeTap, startClock(this.springClock))),
            ]))} />
            <PanGestureHandler
              ref={this.panRef}
              onGestureEvent={this.handlePan}
              onHandlerStateChange={this.handlePan}
            >
              <Animated.View>
                <TapGestureHandler
                  onHandlerStateChange={this.handleTap}
                >
                  <Animated.View
                    style={{ width: '100%',
                      transform: [
                          { translateY: this.Y }
                        ]
                      }}
                    onLayout={this.handleLayoutContent}
                  >
                    {this.renderInner()}
                  </Animated.View>
                </TapGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Animated.View>
      </View>
    )
  }
}

const IMAGE_SIZE = 200

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  box: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
})

