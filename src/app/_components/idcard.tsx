'use client'
import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, extend, useThree, useFrame, ReactThreeFiber } from '@react-three/fiber'
import { BallCollider, CuboidCollider, Physics, RigidBody, type RigidBodyProps, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'

// In order to use the MeshLine library, which is vanilla Three.js in React,
// we need to extend it. The extend function extends React Three Fiber's 
// catalog of known JSX elements.

extend({ MeshLineGeometry, MeshLineMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      meshLineGeometry: ReactThreeFiber.Object3DNode<MeshLineGeometry, typeof MeshLineGeometry>
      meshLineMaterial: ReactThreeFiber.Object3DNode<MeshLineMaterial, typeof MeshLineMaterial>
    }
  }
}

export function IdCard() { 
  return (
    <Canvas camera={{ position: [0,0,13], fov: 25 }}>
      {/* 
        - debug flag : renders wireframes or outlines of collision shapes
        - interpolate flag : basically makes the animation smoother by interpolating in-between steps
        - gravity : basic gravity in x, y, z directions
        - timeStep (1/60) : means the physics world will update 60 times per second,
        regardless of the actual frame rate. 
      */}
      <Physics debug interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band />
      </Physics>
    </Canvas>
  )
}

// Setting up the band of the Id Card.
const Band = () => {
  // Different components of the band
  // By having all of them be ref, we make sure that when they change the component is not RE-RENDERED.
  const band = useRef<any>()
  const fixed = useRef<any>()
  const joint1 = useRef<any>()
  const joint2 = useRef<any>()
  const joint3 = useRef<any>()
  const card = useRef<any>()

  const vec = new THREE.Vector3()
  const angle = new THREE.Vector3()
  const rotation = new THREE.Vector3()
  const direction = new THREE.Vector3()

  // Canvas size 
  const { width, height } = useThree((state) => state.size)
  // We want to turn the physics sim, when user drags, but when they release we re-run the physics sim
  const [dragged, drag] = useState<any>(false)

  // Catmull-Rom curve (interesting path curve while interaction)
  const [curve] = useState<any>(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
  ]))

  // Defining where the joints exist
  useRopeJoint(fixed, joint1, [[0,0,0],[0,0,0],1]) // prettier-ignore
  useRopeJoint(joint1, joint2, [[0,0,0],[0,0,0],1]) // prettier-ignore
  useRopeJoint(joint2, joint3, [[0,0,0],[0,0,0],1])
  useSphericalJoint(joint3, card, [[0,0,0],[0,1.45,0]])

  // Calculating the dragged state is the tricky bit, for translating a pointer event coordinate to a 3D object
  // which is called (camera unprojection). Three.js has a method for this, unproject(state.camera) which does most
  // math.

  useFrame((state, delta) => {
    if (dragged) {
      // Physics sim is off in this if.
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      direction.copy(vec).sub(state.camera.position).normalize()
      vec.add(direction.multiplyScalar(state.camera.position.length()))
        ;[card, joint1, joint2, joint3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z })
    }

    if (fixed.current) {
      // Calculate catmul curve      
      curve.points[0].copy(joint3.current.translation())
      curve.points[1].copy(joint2.current.translation())
      curve.points[2].copy(joint1.current.translation())
      curve.points[3].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(32))
      // Tilt it back towards the screen
      angle.copy(card.current.angvel())
      rotation.copy(card.current.rotation())

      // The code below makes sure the card is always facing you after rotation
      card.current.setAngvel({ x: angle.x, y: angle.y - rotation.y * 0.25, z: angle.z })
    }
  })

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} angularDamping={2} linearDamping={2} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={joint1} angularDamping={2} linearDamping={2}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={joint2} angularDamping={2} linearDamping={2}>
          <BallCollider args={[0.1]} />
        </RigidBody >
        <RigidBody position={[1.5, 0, 0]} ref={joint3} angularDamping={2} linearDamping={2}>
          <BallCollider args={[0.1]} />
        </RigidBody >
        <RigidBody position={[2, 0, 0]} ref={card} angularDamping={2} linearDamping={2} type={dragged ? 'kinematicPosition' : 'dynamic'} >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <mesh
            onPointerUp={(e : any) => (e.target?.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={(e : any) => (e.target?.setPointerCapture(e.pointerId), drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation()))))}>
            <planeGeometry args={[0.8 * 2, 1.125 * 2]} />
            <meshBasicMaterial transparent opacity={0.25} color="white" side={THREE.DoubleSide} />
          </mesh>
        </RigidBody >
      </group >
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial transparent opacity={0.25} color="white" depthTest={false} resolution={new THREE.Vector2(width, height)} lineWidth={1} />
      </mesh>
    </>
  )
}


