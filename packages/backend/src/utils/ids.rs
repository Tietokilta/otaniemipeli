use serde::{Deserialize, Deserializer, Serialize, Serializer};
use tokio_postgres::types::{FromSql, IsNull, ToSql, Type};

macro_rules! define_id {
    ($name:ident) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub struct $name(pub i32);

        impl Serialize for $name {
            fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: Serializer,
            {
                serializer.serialize_i32(self.0)
            }
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: Deserializer<'de>,
            {
                i32::deserialize(deserializer).map($name)
            }
        }

        impl ToSql for $name {
            fn to_sql(
                &self,
                ty: &Type,
                out: &mut bytes::BytesMut,
            ) -> Result<IsNull, Box<dyn std::error::Error + Sync + Send>> {
                self.0.to_sql(ty, out)
            }

            fn accepts(ty: &Type) -> bool {
                <i32 as ToSql>::accepts(ty)
            }

            tokio_postgres::types::to_sql_checked!();
        }

        impl<'a> FromSql<'a> for $name {
            fn from_sql(
                ty: &Type,
                raw: &'a [u8],
            ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
                i32::from_sql(ty, raw).map($name)
            }

            fn accepts(ty: &Type) -> bool {
                <i32 as FromSql>::accepts(ty)
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}", self.0)
            }
        }
    };
}

define_id!(UserId);
define_id!(GameId);
define_id!(TeamId);
define_id!(TurnId);
define_id!(BoardId);
define_id!(PlaceId);
define_id!(DrinkId);
define_id!(IngredientId);
